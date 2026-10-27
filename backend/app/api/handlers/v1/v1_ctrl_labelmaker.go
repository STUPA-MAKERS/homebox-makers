package v1

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hay-kot/httpkit/errchain"
	"github.com/sysadminsmedia/homebox/backend/internal/core/services"
	"github.com/sysadminsmedia/homebox/backend/internal/data/repo"
	"github.com/sysadminsmedia/homebox/backend/internal/sys/validate"
	"github.com/sysadminsmedia/homebox/backend/internal/web/adapters"
	"github.com/sysadminsmedia/homebox/backend/pkgs/labelmaker"
)

// entityLabel is the label content of an item or a location.
func entityLabel(e repo.EntityOut, url string) labelmaker.LabelContent {
	return labelmaker.LabelContent{
		Title:       e.Name,
		Description: e.Description,
		Maker:       e.Manufacturer,
		Model:       e.ModelNumber,
		AssetID:     e.AssetID.String(),
		URL:         url,
	}
}

func generateOrPrint(ctrl *V1Controller, w http.ResponseWriter, r *http.Request, content labelmaker.LabelContent) error {
	conf := ctrl.config.LabelMaker
	params := labelmaker.NewGenerateParams(conf.TapeWidth, conf.Length, conf.Dpi, content, conf.AdditionalInformation)

	print := queryBool(r.URL.Query().Get("print"))

	if print {
		err := labelmaker.PrintLabel(ctrl.config, &params)
		if err != nil {
			return err
		}

		_, err = w.Write([]byte("Printed!"))
		return err
	} else {
		return labelmaker.GenerateLabel(w, &params, ctrl.config)
	}
}

// HandleGetLocationLabel godoc
//
//	@Summary	Get Location label
//	@Tags		Locations
//	@Produce	json
//	@Param		id		path		string	true	"Location ID"
//	@Param		print	query		bool	false	"Print this label, defaults to false"
//	@Success	200		{string}	string	"image/png"
//	@Router		/v1/labelmaker/location/{id} [GET]
//	@Security	Bearer
func (ctrl *V1Controller) HandleGetLocationLabel() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		ID, err := adapters.RouteUUID(r, "id")
		if err != nil {
			return err
		}

		auth := services.NewContext(r.Context())
		location, err := ctrl.repo.Entities.GetContainerByGroup(auth, auth.GID, ID)
		if err != nil {
			return err
		}

		hbURL := GetHBURL(r, &ctrl.config.Options, ctrl.url)
		return generateOrPrint(ctrl, w, r, entityLabel(location, fmt.Sprintf("%s/location/%s", hbURL, location.ID)))
	}
}

// HandleGetItemLabel godoc
//
//	@Summary	Get Item label
//	@Tags		Items
//	@Produce	json
//	@Param		id		path		string	true	"Item ID"
//	@Param		print	query		bool	false	"Print this label, defaults to false"
//	@Success	200		{string}	string	"image/png"
//	@Router		/v1/labelmaker/item/{id} [GET]
//	@Security	Bearer
func (ctrl *V1Controller) HandleGetItemLabel() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		ID, err := adapters.RouteUUID(r, "id")
		if err != nil {
			return err
		}

		auth := services.NewContext(r.Context())
		item, err := ctrl.repo.Entities.GetOneByGroup(auth, auth.GID, ID)
		if err != nil {
			return err
		}

		hbURL := GetHBURL(r, &ctrl.config.Options, ctrl.url)
		return generateOrPrint(ctrl, w, r, entityLabel(item, fmt.Sprintf("%s/item/%s", hbURL, item.ID)))
	}
}

// HandleGetAssetLabel godoc
//
//	@Summary	Get Asset label
//	@Tags		Items
//	@Produce	json
//	@Param		id		path		string	true	"Asset ID"
//	@Param		print	query		bool	false	"Print this label, defaults to false"
//	@Success	200		{string}	string	"image/png"
//	@Router		/v1/labelmaker/asset/{id} [GET]
//	@Security	Bearer
func (ctrl *V1Controller) HandleGetAssetLabel() errchain.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) error {
		assetIDParam := chi.URLParam(r, "id")
		assetID, ok := repo.ParseAssetID(assetIDParam)
		if !ok {
			return validate.NewRequestError(fmt.Errorf("invalid asset id"), http.StatusBadRequest)
		}

		auth := services.NewContext(r.Context())
		item, err := ctrl.repo.Entities.QueryByAssetID(auth, auth.GID, assetID, 0, 1)
		if err != nil {
			return err
		}

		if len(item.Items) == 0 {
			return validate.NewRequestError(fmt.Errorf("failed to find asset id"), http.StatusNotFound)
		}

		// The search result is a summary; the label needs maker and model.
		entity, err := ctrl.repo.Entities.GetOneByGroup(auth, auth.GID, item.Items[0].ID)
		if err != nil {
			return err
		}

		hbURL := GetHBURL(r, &ctrl.config.Options, ctrl.url)
		return generateOrPrint(ctrl, w, r, entityLabel(entity, fmt.Sprintf("%s/a/%s", hbURL, entity.AssetID.String())))
	}
}
