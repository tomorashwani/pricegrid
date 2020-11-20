sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
		"sap/ui/model/json/JSONModel"
], function (Controller, History, JSONModel) {
	"use strict";

	return Controller.extend("cf.pricegrid.controller.BaseController", {
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter : function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel : function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel : function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle : function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},
		
		getProductData: function(name)  {
			var priceModel = new JSONModel();
			var g = this;
			$.ajax({
				url: "/cfpricegrid/pricing/PriceGrid.xsodata/PriceGrid?$format=json&$top=100&$filter=NAME eq '" + name + "'",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					//var oModel = new sap.ui.model.json.JSONModel(response.d.results);
					//that.getView().byId("order").setModel(oModel);
					console.log(response.d.results);
					priceModel.setData(response.d.results);
					sap.ui.getCore().setModel(priceModel, "priceModel");
					// return response.d.results;
				},
				error: function (error) {
					//sap.m.MessageToast.show("Error");
					return false;
				}
			});
		}

	});

});