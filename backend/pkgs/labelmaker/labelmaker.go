// Package labelmaker provides functionality for generating and printing labels for items, locations and assets stored in Homebox.
// The labels follow the STUPA MAKERS inventory label, see makers_label.go.
package labelmaker

import (
	"fmt"
	"image/png"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"
	"time"
	"unicode"

	"github.com/golang/freetype/truetype"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/config"
)

type FontType int

const (
	FontTypeRegular FontType = iota
	FontTypeBold
)

// GenerateParameters holds the size and the content of one label. Lengths are
// in mm; Width and Height are the size of the image in pixels at Dpi.
type GenerateParameters struct {
	TapeWidth             float64
	Length                float64
	Dpi                   float64
	Width                 int
	Height                int
	TitleText             string
	DescriptionText       string
	Maker                 string
	Model                 string
	AssetID               string
	AdditionalInformation *string
	URL                   string
}

func (p *GenerateParameters) Validate() error {
	if p.TapeWidth <= 0 {
		return fmt.Errorf("invalid tape width")
	}
	if p.Length < minLength {
		return fmt.Errorf("invalid length: a label must be at least %.0f mm long", minLength)
	}
	if p.Dpi <= 0 {
		return fmt.Errorf("invalid dpi")
	}
	return nil
}

// LabelContent is the text of a label.
type LabelContent struct {
	// Title is what the item is, on the first line of the box.
	Title string
	// Description is the text below the title. Empty leaves room for notes by
	// hand.
	Description string
	// Maker and Model are in the black bar.
	Maker string
	Model string
	// AssetID is below the QR code.
	AssetID string
	// URL is the content of the QR code.
	URL string
}

func NewGenerateParams(tapeWidth float64, length float64, dpi float64, content LabelContent, additionalInformation *string) GenerateParameters {
	return GenerateParameters{
		TapeWidth:             tapeWidth,
		Length:                length,
		Dpi:                   dpi,
		Width:                 int(math.Round(tapeWidth * dpi / 25.4)),
		Height:                int(math.Round(length * dpi / 25.4)),
		TitleText:             content.Title,
		DescriptionText:       content.Description,
		Maker:                 content.Maker,
		Model:                 content.Model,
		AssetID:               content.AssetID,
		AdditionalInformation: additionalInformation,
		URL:                   content.URL,
	}
}

// loadFont loads the regular or the bold monospaced font of the label. The
// configured font paths replace the embedded DejaVu Sans Mono, for example for
// CJK text.
func loadFont(cfg *config.Config, fontType FontType) (*truetype.Font, error) {
	var fontPath *string
	var fallbackData []byte

	switch fontType {
	case FontTypeRegular:
		if cfg != nil && cfg.LabelMaker.RegularFontPath != nil {
			fontPath = cfg.LabelMaker.RegularFontPath
		}
		fallbackData = monoTTF
	case FontTypeBold:
		if cfg != nil && cfg.LabelMaker.BoldFontPath != nil {
			fontPath = cfg.LabelMaker.BoldFontPath
		}
		fallbackData = monoBoldTTF
	default:
		return nil, fmt.Errorf("unknown font type: %d", fontType)
	}

	if fontPath != nil && *fontPath != "" {
		data, err := os.ReadFile(*fontPath)
		if err != nil {
			log.Printf("Failed to load font from %s: %v, using fallback font", *fontPath, err)
		} else {
			font, err := truetype.Parse(data)
			if err != nil {
				log.Printf("Failed to parse font from %s: %v, using fallback font", *fontPath, err)
			} else {
				log.Printf("Successfully loaded font from %s", *fontPath)
				return font, nil
			}
		}
	}

	font, err := truetype.Parse(fallbackData)
	if err != nil {
		return nil, err
	}

	return font, nil
}

func GenerateLabel(w io.Writer, params *GenerateParameters, cfg *config.Config) error {
	if err := params.Validate(); err != nil {
		return err
	}

	// If LabelServiceUrl is configured, fetch the label from the URL instead of generating it
	if cfg != nil && cfg.LabelMaker.LabelServiceUrl != nil && *cfg.LabelMaker.LabelServiceUrl != "" {
		log.Printf("LabelServiceUrl configured: %s", *cfg.LabelMaker.LabelServiceUrl)

		return fetchLabelFromURL(w, *cfg.LabelMaker.LabelServiceUrl, params, cfg)
	}

	var fonts labelFonts
	var err error
	if fonts.mono, err = loadFont(cfg, FontTypeRegular); err != nil {
		return err
	}
	if fonts.monoBold, err = loadFont(cfg, FontTypeBold); err != nil {
		return err
	}
	// The asset id is ASCII, so it always uses the embedded font.
	if fonts.sansBold, err = truetype.Parse(sansBoldTTF); err != nil {
		return err
	}

	img, err := renderMakersLabel(params, fonts)
	if err != nil {
		return err
	}

	return png.Encode(w, img)
}

// fetchLabelFromURL fetches an image from the specified URL and writes it to the writer
func fetchLabelFromURL(w io.Writer, serviceURL string, params *GenerateParameters, cfg *config.Config) error {
	// Parse the base URL
	baseURL, err := url.Parse(serviceURL)
	if err != nil {
		return fmt.Errorf("failed to parse service URL %s: %w", serviceURL, err)
	}

	// Build query parameters with the same attributes passed to print command
	query := url.Values{}
	query.Set("Width", fmt.Sprintf("%d", params.Width))
	query.Set("Height", fmt.Sprintf("%d", params.Height))
	query.Set("TapeWidth", fmt.Sprintf("%f", params.TapeWidth))
	query.Set("Length", fmt.Sprintf("%f", params.Length))
	query.Set("Dpi", fmt.Sprintf("%f", params.Dpi))
	query.Set("TitleText", params.TitleText)
	query.Set("DescriptionText", params.DescriptionText)
	query.Set("Maker", params.Maker)
	query.Set("Model", params.Model)
	query.Set("AssetID", params.AssetID)
	query.Set("URL", params.URL)

	// Add AdditionalInformation if it exists
	if params.AdditionalInformation != nil {
		query.Set("AdditionalInformation", *params.AdditionalInformation)
	}

	// Set the query parameters
	baseURL.RawQuery = query.Encode()
	finalServiceURL := baseURL.String()

	log.Printf("Fetching label from URL: %s", finalServiceURL)

	// Use configured timeout or default to 30 seconds
	timeout := 30 * time.Second
	if cfg != nil && cfg.LabelMaker.LabelServiceTimeout != nil {
		timeout = *cfg.LabelMaker.LabelServiceTimeout
	}

	// Create HTTP client with configurable timeout
	client := &http.Client{
		Timeout: timeout,
	}

	// Create HTTP request with custom headers
	req, err := http.NewRequest("GET", finalServiceURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request for URL %s: %w", finalServiceURL, err)
	}

	// Set custom headers
	req.Header.Set("User-Agent", "Homebox-LabelMaker/1.0")
	req.Header.Set("Accept", "image/*")

	// Make HTTP request to the label service
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch label from URL %s: %w", finalServiceURL, err)
	}

	// Check if the response status is OK
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("label service returned status %d for URL %s", resp.StatusCode, finalServiceURL)
	}

	// Check if the response is an image
	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		return fmt.Errorf("label service returned invalid content type %s, expected image/*", contentType)
	}

	// Set default max response size (10MB)
	maxResponseSize := int64(10 << 20)
	if cfg != nil {
		maxResponseSize = cfg.Web.MaxUploadSize << 20
	}
	limitedReader := io.LimitReader(resp.Body, maxResponseSize)

	// Copy the response body to the writer
	_, err = io.Copy(w, limitedReader)
	if err != nil {
		return fmt.Errorf("failed to write fetched label data: %w", err)
	}

	if err := resp.Body.Close(); err != nil {
		log.Printf("failed to close response body: %v", err)
	}

	return nil
}

// splitCommandTemplate splits a print-command template into argv tokens on
// whitespace, treating any `{{ ... }}` template action as opaque so that
// whitespace *inside* an action (e.g. `{{ .FileName }}`) does not split the
// token. This lets the admin's spacing define argument boundaries up front,
// before any user-controlled value is substituted in.
func splitCommandTemplate(s string) []string {
	var (
		parts    []string
		cur      strings.Builder
		inAction bool
	)
	runes := []rune(s)
	for i := 0; i < len(runes); i++ {
		switch {
		case !inAction && i+1 < len(runes) && runes[i] == '{' && runes[i+1] == '{':
			inAction = true
			cur.WriteRune(runes[i])
			cur.WriteRune(runes[i+1])
			i++
		case inAction && i+1 < len(runes) && runes[i] == '}' && runes[i+1] == '}':
			inAction = false
			cur.WriteRune(runes[i])
			cur.WriteRune(runes[i+1])
			i++
		case !inAction && unicode.IsSpace(runes[i]):
			if cur.Len() > 0 {
				parts = append(parts, cur.String())
				cur.Reset()
			}
		default:
			cur.WriteRune(runes[i])
		}
	}
	if cur.Len() > 0 {
		parts = append(parts, cur.String())
	}
	return parts
}

func PrintLabel(cfg *config.Config, params *GenerateParameters) error {
	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("label-%d.png", time.Now().UnixNano()))
	f, err := os.OpenFile(tmpFile, os.O_RDWR|os.O_CREATE|os.O_EXCL, 0600)
	if err != nil {
		return err
	}
	defer func() {
		_ = f.Close()
		if err := os.Remove(f.Name()); err != nil {
			log.Printf("failed to remove temporary label file: %v", err)
		}
	}()

	err = GenerateLabel(f, params, cfg)
	if err != nil {
		return err
	}

	if cfg.LabelMaker.PrintCommand == nil {
		return fmt.Errorf("no print command specified")
	}

	additionalInformation := func() string {
		if params.AdditionalInformation != nil {
			return *params.AdditionalInformation
		}
		return ""
	}()
	templateData := map[string]string{
		"FileName":              f.Name(),
		"Width":                 fmt.Sprintf("%d", params.Width),
		"Height":                fmt.Sprintf("%d", params.Height),
		"TapeWidth":             fmt.Sprintf("%f", params.TapeWidth),
		"Length":                fmt.Sprintf("%f", params.Length),
		"Dpi":                   fmt.Sprintf("%f", params.Dpi),
		"TitleText":             params.TitleText,
		"DescriptionText":       params.DescriptionText,
		"Maker":                 params.Maker,
		"Model":                 params.Model,
		"AssetID":               params.AssetID,
		"AdditionalInformation": additionalInformation,
		"URL":                   params.URL,
	}

	// SECURITY: split the admin-configured command into argv tokens *before*
	// substituting any values, then render each token independently. Several of
	// these fields (TitleText/DescriptionText, derived from item and location
	// names) are controlled by any authenticated user. If we rendered first and
	// split on whitespace afterwards, a user could embed spaces in an item name
	// to smuggle extra arguments into the print binary (argument injection).
	// Per-token rendering keeps every substituted value confined to the single
	// argv entry the admin placed it in, regardless of its contents.
	var commandParts []string
	for _, rawPart := range splitCommandTemplate(*cfg.LabelMaker.PrintCommand) {
		tmpl, err := template.New("command").Parse(rawPart)
		if err != nil {
			return fmt.Errorf("invalid print command template: %w", err)
		}
		builder := &strings.Builder{}
		if err := tmpl.Execute(builder, templateData); err != nil {
			return err
		}
		// Drop tokens that render empty so an unset placeholder doesn't become a
		// stray empty argument — matching the previous whitespace-collapsing
		// behavior without re-splitting rendered output.
		if rendered := builder.String(); rendered != "" {
			commandParts = append(commandParts, rendered)
		}
	}
	if len(commandParts) == 0 {
		return nil
	}

	command := exec.Command(commandParts[0], commandParts[1:]...)

	_, err = command.CombinedOutput()
	if err != nil {
		return err
	}

	return nil
}
