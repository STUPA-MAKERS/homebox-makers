package labelmaker

import (
	"bytes"
	_ "embed"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"math"
	"strings"
	"unicode/utf8"

	"github.com/golang/freetype/truetype"
	"github.com/skip2/go-qrcode"
	xdraw "golang.org/x/image/draw"
	"golang.org/x/image/font"
	"golang.org/x/image/math/fixed"
)

// The STUPA MAKERS inventory label for a Brother QL-800 on 62 mm continuous
// tape, after the makers-labels Typst template. All lengths are in mm. The
// driver keeps 3 mm free at each end of the label and 1.5 mm at each edge, so
// all content stays inside the safe area. The logo and the QR code scale with
// the label length that is left.
//
// The printer prints black only, thus the logo is a black copy of the colour
// logo. The PNGs in assets/ are rendered from the SVGs next to them; the word
// mark is turned to read upwards. The icon has a white outline on each petal:
// without it, the gaps between the petals are too narrow for 300 dpi.
const (
	safeX      = 2.0
	safeY      = 3.3
	logoGap    = 0.6
	iconRatio  = 447.56247 / 461.55865 // icon height / width
	wordRatio  = 1200.0079 / 445.26431 // word mark height / width, turned
	logoGutter = 1.2
	qrMaxSize  = 12.5
	qrPadding  = 2.5 // width of the QR column minus the QR code
	lineWeight = 0.3
	cellInsetX = 1.0
	idSpacing  = 0.6

	titleSize = 8.5 // pt
	notesSize = 6.5 // pt
	barSize   = 7.0 // pt
	idSize    = 6.5 // pt

	// Typst sets lines with 0.65em leading between the baseline and the cap
	// height of the next line.
	leading = 0.65
	// The smallest label length that leaves room for the QR code and its id.
	minLength = 12.0
)

var (
	//go:embed assets/DejaVuSansMono.ttf
	monoTTF []byte
	//go:embed assets/DejaVuSansMono-Bold.ttf
	monoBoldTTF []byte
	//go:embed assets/DejaVuSans-Bold.ttf
	sansBoldTTF []byte
	//go:embed assets/makers-icon.png
	iconPNG []byte
	//go:embed assets/makers-word.png
	wordPNG []byte
)

// canvas draws on the label image with lengths in mm.
type canvas struct {
	img *image.RGBA
	dpi float64
}

func (c *canvas) px(mm float64) int {
	return int(math.Round(mm * c.dpi / 25.4))
}

// rect returns the pixel rectangle of the area at (x, y) with size (w, h).
func (c *canvas) rect(x, y, w, h float64) image.Rectangle {
	return image.Rect(c.px(x), c.px(y), c.px(x+w), c.px(y+h))
}

func (c *canvas) fill(r image.Rectangle, col color.Color) {
	draw.Draw(c.img, r, image.NewUniform(col), image.Point{}, draw.Src)
}

// hline and vline draw a line of lineWeight, centred on the given position
// like a Typst stroke.
func (c *canvas) hline(x, y, w float64) {
	c.fill(c.rect(x-lineWeight/2, y-lineWeight/2, w+lineWeight, lineWeight), color.Black)
}

func (c *canvas) vline(x, y, h float64) {
	c.fill(c.rect(x-lineWeight/2, y-lineWeight/2, lineWeight, h+lineWeight), color.Black)
}

// dottedHline draws a Typst "densely-dotted" line: dots as wide as the line
// weight, 1 pt apart.
func (c *canvas) dottedHline(x, y, w float64) {
	period := lineWeight + 25.4/72
	for dx := 0.0; dx+lineWeight <= w+lineWeight/2; dx += period {
		c.fill(c.rect(x+dx, y-lineWeight/2, lineWeight, lineWeight), color.Black)
	}
}

func (c *canvas) image(src image.Image, x, y, w, h float64) {
	xdraw.CatmullRom.Scale(c.img, c.rect(x, y, w, h), src, src.Bounds(), xdraw.Over, nil)
}

// textStyle is one font at one size.
type textStyle struct {
	face font.Face
	// capHeight and pitch are in mm: the height of a line box (cap height to
	// baseline) and the distance between two baselines.
	capHeight float64
	pitch     float64
}

func newTextStyle(f *truetype.Font, size float64, dpi float64) textStyle {
	face := truetype.NewFace(f, &truetype.Options{Size: size, DPI: dpi, Hinting: font.HintingNone})
	capHeight := size * 25.4 / 72 * 0.73
	if b, _, ok := face.GlyphBounds('H'); ok {
		capHeight = float64(-b.Min.Y) / 64 * 25.4 / dpi
	}
	return textStyle{face: face, capHeight: capHeight, pitch: capHeight + leading*size*25.4/72}
}

// width returns the width of s in mm.
func (c *canvas) width(s string, st textStyle) float64 {
	return float64(font.MeasureString(st.face, s)) / 64 * 25.4 / c.dpi
}

// text draws s with its baseline at y. clip limits the drawing; text outside
// it is cut off.
func (c *canvas) text(s string, st textStyle, x, baseline float64, col color.Color, clip image.Rectangle) {
	dst, ok := c.img.SubImage(clip).(*image.RGBA)
	if !ok {
		return
	}
	d := font.Drawer{
		Dst:  dst,
		Src:  image.NewUniform(col),
		Face: st.face,
		Dot:  fixed.Point26_6{X: fixed.Int26_6(x * c.dpi / 25.4 * 64), Y: fixed.Int26_6(baseline * c.dpi / 25.4 * 64)},
	}
	d.DrawString(s)
}

// fit shortens s with an ellipsis until it is at most width mm wide.
func (c *canvas) fit(s string, st textStyle, width float64) string {
	if c.width(s, st) <= width {
		return s
	}
	runes := []rune(s)
	for n := len(runes) - 1; n > 0; n-- {
		cut := strings.TrimRight(string(runes[:n]), " ") + "…"
		if c.width(cut, st) <= width {
			return cut
		}
	}
	return ""
}

// wrap breaks text into lines of at most width mm. Line breaks in text are
// kept. A word that is wider than a line is broken between characters.
func (c *canvas) wrap(text string, st textStyle, width float64) []string {
	var lines []string
	for _, para := range strings.Split(text, "\n") {
		words := strings.Fields(para)
		if len(words) == 0 {
			lines = append(lines, "")
			continue
		}
		line := ""
		for _, word := range words {
			candidate := word
			if line != "" {
				candidate = line + " " + word
			}
			if c.width(candidate, st) <= width {
				line = candidate
				continue
			}
			if line != "" {
				lines = append(lines, line)
			}
			// Break a word that does not fit on a line of its own.
			for c.width(word, st) > width && utf8.RuneCountInString(word) > 1 {
				cut := 1
				for i := range word {
					if i > 0 && c.width(word[:i], st) > width {
						break
					}
					cut = i
				}
				if cut == 0 {
					_, cut = utf8.DecodeRuneInString(word)
				}
				lines = append(lines, word[:cut])
				word = word[cut:]
			}
			line = word
		}
		lines = append(lines, line)
	}
	return lines
}

type labelFonts struct {
	mono, monoBold, sansBold *truetype.Font
}

// renderMakersLabel draws one inventory label.
func renderMakersLabel(params *GenerateParameters, fonts labelFonts) (*image.RGBA, error) {
	c := &canvas{dpi: params.Dpi}
	c.img = image.NewRGBA(image.Rect(0, 0, c.px(params.TapeWidth), c.px(params.Length)))
	c.fill(c.img.Bounds(), color.White)

	inner := params.Length - 2*safeY
	logoWidth := (inner - logoGap) / (iconRatio + wordRatio)
	qrSize := math.Min(qrMaxSize, inner-3.8)

	// The logo column: the icon on top, the word mark below it.
	icon, err := png.Decode(bytes.NewReader(iconPNG))
	if err != nil {
		return nil, err
	}
	word, err := png.Decode(bytes.NewReader(wordPNG))
	if err != nil {
		return nil, err
	}
	iconHeight := logoWidth * iconRatio
	c.image(icon, safeX, safeY, logoWidth, iconHeight)
	c.image(word, safeX, safeY+iconHeight+logoGap, logoWidth, logoWidth*wordRatio)

	// The box with the text on the left and the QR code on the right.
	boxX := safeX + logoWidth + logoGutter
	boxW := params.TapeWidth - safeX - boxX
	codeW := qrSize + qrPadding
	mainW := boxW - codeW

	title := newTextStyle(fonts.mono, titleSize, c.dpi)
	notes := newTextStyle(fonts.mono, notesSize, c.dpi)
	bar := newTextStyle(fonts.monoBold, barSize, c.dpi)
	id := newTextStyle(fonts.sansBold, idSize, c.dpi)

	// The title on one line, so the notes keep their room, then a dotted line.
	titleTop := safeY + 1.0
	titleText := c.fit(strings.Join(strings.Fields(params.TitleText), " "), title, mainW-2*cellInsetX)
	c.text(titleText, title, boxX+cellInsetX, titleTop+title.capHeight, color.Black, c.rect(boxX, safeY, mainW, 1.0+title.capHeight+0.8))
	ruleY := titleTop + title.capHeight + 0.8

	// The black bar with the maker on the left and the model centred in the
	// space after it.
	barH := 0.6 + bar.capHeight + 0.6
	barY := safeY + inner - barH
	barRect := c.rect(boxX, barY, mainW, barH)
	c.fill(barRect, color.Black)
	baseline := barY + 0.6 + bar.capHeight
	// If both do not fit, the maker is shortened: the model tells more.
	barW := mainW - 2*cellInsetX
	model := c.fit(params.Model, bar, barW)
	modelW := c.width(model, bar)
	maker := params.Maker
	if model != "" {
		maker = c.fit(maker, bar, barW-modelW-c.width("  ", bar))
	} else {
		maker = c.fit(maker, bar, barW)
	}
	makerW := c.width(maker, bar)
	free := math.Max(0, barW-makerW-modelW)
	barClip := c.rect(boxX+cellInsetX, barY, barW, barH)
	c.text(maker, bar, boxX+cellInsetX, baseline, color.White, barClip)
	c.text(model, bar, boxX+cellInsetX+makerW+free/2, baseline, color.White, barClip)

	// The notes between the dotted line and the bar. Lines that do not fit
	// are cut off, not moved into the bar.
	body := params.DescriptionText
	if params.AdditionalInformation != nil && *params.AdditionalInformation != "" {
		if body != "" {
			body += "\n"
		}
		body += *params.AdditionalInformation
	}
	if strings.TrimSpace(body) != "" {
		notesX := boxX + 2*cellInsetX
		notesTop := ruleY + 0.8
		notesBottom := barY - 0.8
		notesClip := c.rect(boxX+cellInsetX, ruleY, mainW-2*cellInsetX, barY-ruleY)
		for i, line := range c.wrap(body, notes, mainW-4*cellInsetX) {
			lineBaseline := notesTop + notes.capHeight + float64(i)*notes.pitch
			if lineBaseline > notesBottom {
				break
			}
			c.text(line, notes, notesX, lineBaseline, color.Black, notesClip)
		}
	}

	c.dottedHline(boxX, ruleY, mainW)

	// The QR code with the asset id below it, centred in its column.
	qr, err := qrcode.New(params.URL, qrcode.Medium)
	if err != nil {
		return nil, err
	}
	qr.DisableBorder = true
	codeX := boxX + mainW
	stackH := qrSize
	if params.AssetID != "" {
		stackH += idSpacing + id.capHeight
	}
	qrX := codeX + (codeW-qrSize)/2
	qrY := safeY + (inner-stackH)/2
	qrRect := c.rect(qrX, qrY, qrSize, qrSize)
	draw.Draw(c.img, qrRect, qr.Image(qrRect.Dx()), image.Point{}, draw.Src)
	if params.AssetID != "" {
		idW := c.width(params.AssetID, id)
		c.text(params.AssetID, id, codeX+(codeW-idW)/2, qrY+qrSize+idSpacing+id.capHeight, color.Black, c.rect(codeX, safeY, codeW, inner))
	}

	// The frame and the line between the text and the QR code.
	c.hline(boxX, safeY, boxW)
	c.hline(boxX, safeY+inner, boxW)
	c.vline(boxX, safeY, inner)
	c.vline(boxX+boxW, safeY, inner)
	c.vline(codeX, safeY, inner)

	return c.img, nil
}
