sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/Fragment"
], function (BaseController, JSONModel, Fragment) {
	"use strict";

	return BaseController.extend("cf.pricegrid.controller.App", {

		onInit: function () {
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			this.user = 'Ashley Nalley';
			var that = this;

			oViewModel = new JSONModel({
				busy: true,
				delay: 0,
				layout: "OneColumn",
				previousLayout: "",
				actionButtonsInfo: {
					midColumn: {
						fullScreen: false
					}
				}
			});
			this.setModel(oViewModel, "appView");

			fnSetAppNotBusy = function () {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			// apply content density mode to root view
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

			/*var localData = this.getOwnerComponent().getModel("localData").getData();
			var lModel = new JSONModel(localData);
			this.getView().setModel(lModel, "localModel");*/
		},

		onAfterRendering: function () {
			// var oModel = new sap.ui.model.json.JSONModel();
			// this.getView().setModel(oModel, "menuModel");

			/*var g = this;
			$.ajax({
				url: "/user"
			}).done(function (data, status, jqxhr) {
				console.log(data);
			});*/
			// this.selectedCat=document.getElementById('container-pricegrid---App--prodCat-labelText').innerHTML;
		}


	});
});