sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../model/formatter"
], function (BaseController, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter) {
	"use strict";

	return BaseController.extend("cf.pricegrid.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function () {

			var oDeviceModel = new JSONModel(Device);
			this.setModel(oDeviceModel, "device");

			var oList = this.byId("list");
			//var oViewModel = this._createViewModel();
			// Put down master list's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the master list is
			// taken care of by the master list itself.
			// iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			// this.setModel(oViewModel, "masterView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for the list
				// oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);

			this.proCat = {
				"ProductCategory": [{
					"key": "",
					"name": ""
				}, {
					"key": "Residential Broadloom",
					"name": "Residential Broadloom"
				}, {
					"key": "Resilient Tile",
					"name": "Resilient Tile"
				}, {
					"key": "RevWood",
					"name": "RevWood"
				}, {
					"key": "Carpet Tile",
					"name": "Carpet Tile"
				}, {
					"key": "Commercial Broadloom",
					"name": "Commercial Broadloom"
				}, {
					"key": "Cushion",
					"name": "Cushion"
				}, {
					"key": "TecWood",
					"name": "TecWood"
				}, {
					"key": "SolidWood",
					"name": "Solid Wood"
				}, {
					"key": "Resilient Sheet",
					"name": "Resilient Sheet"
				}, {
					"key": "Tile",
					"name": "Tile"
				}, {
					"key": "Accessories",
					"name": "Accessories"
				}]
			};

			var lModel = new JSONModel(this.proCat);
			this.getView().setModel(lModel, "local");
			this.getView().byId("prodCat").setModel(lModel, "local");
			this.getView().byId("prodCat2").setModel(lModel, "local");

			var localData = this.getOwnerComponent().getModel("local").getData();
			this.filterData = localData.FilterMapping;

			this.getView().byId("masterPage2").setVisible(false);
			this.getView().byId("masterPage").setVisible(true);

			// this.user = 'Ashley Nalley';
			var that = this;
			var appName = "Price_Grid";
			this.loggedInUser = "";

			// Catalogue Service:
			$.ajax({
				url: "pricing/PriceGrid.xsodata/Catalogue?$filter=GRID_TYPE eq '" + appName + "'",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					that.gridmeta = response.d.results;
					that.gridmeta.sort(that.sortGridMeta);
					var oModel = new JSONModel(that.gridmeta);
					sap.ui.getCore().setModel(oModel, "configModel");
				},
				error: function (error) {}
			});

			// Get Account Number
			var whURL = "pricing/PriceGrid.xsodata/Account";
			var searchParam = document.location.href.split("?");
			if (searchParam.length > 1) {
				var accNo = "";
				if (searchParam.length > 1) {
					accNo = searchParam[1].split("=")[1];
				}
				accNo = accNo.includes("#") ? accNo.replace("#", '') : accNo;
				whURL = "pricing/PriceGrid.xsodata/Account?$filter=ACCOUNT__C eq '" + accNo + "'";
			}

			$.ajax({
				// url: "pricing/PriceGrid.xsodata/Warehouse",
				url: whURL,
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					//var oModel = new sap.ui.model.json.JSONModel(response.d.results);
					//that.getView().byId("order").setModel(oModel);
					//console.log(response.d.results);

					var whResults = response.d.results;

					that.warehouses = [];
					for (var j = 0; j < whResults.length; j++) {
						var tempWH = {
							"WAREHOUSE_CODE__C": whResults[j].WAREHOUSE_CODE__C,
							"WAREHOUSE_CODE__DESC": whResults[j].WAREHOUSE_CODE__DESC
						};
						var whAdded = false;
						for (var s = 0; s < that.warehouses.length; s++) {
							if (that.warehouses[s].WAREHOUSE_CODE__C === tempWH.WAREHOUSE_CODE__C) {
								whAdded = true;
							}
						}
						if (whAdded === false) {
							that.warehouses.push(tempWH);
						}
					}

					// that.warehouses = response.d.results;

					that.warehouses.unshift({
						"WAREHOUSE_CODE__C": "",
						"WAREHOUSE_CODE__DESC": ""
					});

					var oModel = new JSONModel(that.warehouses);
					that.byId("wh").setModel(oModel, "warehouses");
					that.byId("wh2").setModel(oModel, "warehouses");

					if (that.warehouses.length === 2) {
						that.selectedWH = that.warehouses[1].WAREHOUSE_CODE__C;
						that.byId("wh").setSelectedKey(that.warehouses[1].WAREHOUSE_CODE__C);
						that.byId("wh2").setSelectedKey(that.warehouses[1].WAREHOUSE_CODE__C);
					} else {
						that.selectedWH = that.warehouses[0].WAREHOUSE_CODE__C;
						that.byId("wh").setSelectedKey(that.warehouses[0].WAREHOUSE_CODE__C);
						that.byId("wh2").setSelectedKey(that.warehouses[0].WAREHOUSE_CODE__C);
					}
					// that.selectedWH = response.d.results[0].WAREHOUSE_CODE__C;

				},
				error: function (error) {
					that.warehouses = false;
				}
			});

			$.ajax({
				url: "pricing/PriceGrid.xsodata/Brand",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					console.log(response.d.results);

					var brand = response.d.results;

					var salesChnl = [];
					for (var j = 0; j < brand.length; j++) {
						var tempBrand = {
							"key": j,
							"channel": brand[j].SALES_CHANNEL__C
						};
						var channelAdded = false;
						for (var s = 0; s < salesChnl.length; s++) {
							if (salesChnl[s].channel === tempBrand.channel) {
								channelAdded = true;
							}
						}
						if (channelAdded === false) {
							salesChnl.push(tempBrand);
						}
					}

					that.filteredBrand = [];

					salesChnl.unshift({
						"key": "",
						"channel": ""
					});

					that.allSalesChnl = salesChnl;

					var oModel = new JSONModel(salesChnl);
					that.getView().setModel(oModel, "brandModel");
					that.getView().getModel("brandModel").setProperty("/allBrand", brand);
					that.getView().getModel("brandModel").setProperty("/filteredBrand", that.filteredBrand);
					that.getView().getModel("brandModel").setProperty("/allChannel", salesChnl);

					that.getView().byId("masterPage2").setVisible(false);
					that.getView().byId("masterPage").setVisible(true);
				},
				error: function (error) {}
			});

		},

		onAfterRendering: function (oEvent) {
			// this.selectedCat = document.getElementById('container-pricegrid---App--prodCat-labelText').innerHTML;
			var that = this;
			$.ajax({
				url: "../user"
			}).done(function (data, status, jqxhr) {
				console.log(data);
				that.loggedInUser = data;
			});

			// this.loggedInUser = "Saradha_Varadharajan@mohawkind.com";

			$.ajax({
				url: "pricing/PriceGrid.xsodata/UserRole?$filter=EMAILID eq '" + this.loggedInUser + "'",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					if (response.d.results.length > 0) {
						that.userRole = response.d.results[0].ROLE;
					}
					sap.ui.getCore().getModel("configModel").setProperty("/userRole", that.userRole);
				},
				error: function (error) {}
			});

			$("#container-pricegrid---master--list").on('scroll', {
				that: this
			}, this.loadOnScroll);
			var lsModel = new JSONModel();
			this.getView().setModel(lsModel, "listModel");
			var pViewModel = new JSONModel();
			this.getView().setModel(pViewModel, "pViewModel");
			this._filterDisable();

			// var pViewModel = sap.ui.getCore().getModel("pViewModel");
			// this.getView().setModel(pViewModel, "pViewModel");
			// var pViewData = pViewModel.getData();

			// var tCol = localData.Column;
			var priceModel = new JSONModel();
			//this.selectedCat = document.getElementById('container-pricegrid---App--prodCat-labelText').innerHTML;
			/*for (var cat = 0; cat < this.CatProValues.length; cat++) {
				if (this.CatProValues[cat].sfCat == this.selectedCat) {
					this.selectedCatPro = this.CatProValues[cat].cat;
					break;
				}
			}*/
			// this.selectedWH = document.getElementById('container-pricegrid---App--wh-labelText').innerHTML;
			this.fetchTotal = 100; //`Top` variable in teh ajax call
			this.fetchSkip = 0;
			var g = this;
			this.fetchProducts();
			this.endResult = false;
			// this.globalSearchField = "";
			this.globalSearchValue = "";

		},

		_filterDisable: function () {
			var pViewModel = this.getView().getModel("pViewModel");
			if (pViewModel) {
				pViewModel.setProperty("/brandsVisible", false);
				pViewModel.setProperty("/fibersVisible", false);
				pViewModel.setProperty("/fiberBrandsVisible", false);
				pViewModel.setProperty("/constructionsVisible", false);
				pViewModel.setProperty("/weightsVisible", false);
				pViewModel.setProperty("/collectionsVisible", false);
				pViewModel.setProperty("/displayVehiclesVisible", false);
				pViewModel.setProperty("/categoriesVisible", false);
				pViewModel.setProperty("/densityVisible", false);
				pViewModel.setProperty("/gaugeVisible", false);
				pViewModel.setProperty("/sizeVisible", false);
				pViewModel.setProperty("/antimicrobialVisible", false);
				pViewModel.setProperty("/moistureBarriersVisible", false);
				pViewModel.setProperty("/localStockVisible", false);
				pViewModel.setProperty("/segmentsVisible", false);
				pViewModel.setProperty("/widthsVisible", false);
				pViewModel.setProperty("/speciesVisible", false);
				pViewModel.setProperty("/texturesVisible", false);
				pViewModel.setProperty("/featuresVisible", false);
				pViewModel.setProperty("/coresVisible", false);
				pViewModel.setProperty("/wearLayerVisible", false);
				pViewModel.setProperty("/installationVisible", false);
				pViewModel.setProperty("/backingVisible", false);
				pViewModel.setProperty("/descriptionsVisible", false);
				pViewModel.setProperty("/applicationVisible", false);
				pViewModel.setProperty("/technologyVisible", false);
				pViewModel.setProperty("/thicknessVisible", false);
				this.getView().setModel(pViewModel, "pViewModel");
			}
		},
		onFilter: function () {
			var ffVBox = sap.ui.getCore().byId("ffVBox");
			var filterData = this.filterData;
			var that = this;
			var selectedFilters = filterData.filter(function (c) {
				return c.category == that.selectedCat;
			});
			var pViewModel = this.getView().getModel("pViewModel");

			for (var i = 0; i < selectedFilters.length; i++) {
				if (selectedFilters[i].filter === "Brand") {
					pViewModel.setProperty("/brandsVisible", true);
				} else if (selectedFilters[i].filter === "Fiber") {
					pViewModel.setProperty("/fibersVisible", true);
				} else if (selectedFilters[i].filter === "Fiber Brand") {
					pViewModel.setProperty("/fiberBrandsVisible", true);
				} else if (selectedFilters[i].filter === "Construction") {
					pViewModel.setProperty("/constructionsVisible", true);
				} else if (selectedFilters[i].filter === "Weight") {
					pViewModel.setProperty("/weightsVisible", true);
				} else if (selectedFilters[i].filter === "Display Vechicle") {
					pViewModel.setProperty("/collectionsVisible", true);
				} else if (selectedFilters[i].filter === "Collection") {
					pViewModel.setProperty("/displayVehiclesVisible", true);
				} else if (selectedFilters[i].filter === "Category") {
					pViewModel.setProperty("/categoriesVisible", true);
				} else if (selectedFilters[i].filter === "Density") {
					pViewModel.setProperty("/densityVisible", true);
				} else if (selectedFilters[i].filter === "Gauge") {
					pViewModel.setProperty("/gaugeVisible", true);
				} else if (selectedFilters[i].filter === "Size") {
					pViewModel.setProperty("/sizeVisible", true);
				} else if (selectedFilters[i].filter === "Antimicrobial") {
					pViewModel.setProperty("/antimicrobialVisible", true);
				} else if (selectedFilters[i].filter === "Moisture Barriers") {
					pViewModel.setProperty("/moistureBarriersVisible", true);
				} else if (selectedFilters[i].filter === "Local Stock") {
					pViewModel.setProperty("/localStockVisible", true);
				} else if (selectedFilters[i].filter === "Segments") {
					pViewModel.setProperty("/segmentsVisible", true);
				} else if (selectedFilters[i].filter === "Width") {
					pViewModel.setProperty("/widthsVisible", true);
				} else if (selectedFilters[i].filter === "Species") {
					pViewModel.setProperty("/speciesVisible", true);
				} else if (selectedFilters[i].filter === "Textures") {
					pViewModel.setProperty("/texturesVisible", true);
				} else if (selectedFilters[i].filter === "Feature") {
					pViewModel.setProperty("/featuresVisible", true);
				} else if (selectedFilters[i].filter === "Core") {
					pViewModel.setProperty("/coresVisible", true);
				} else if (selectedFilters[i].filter === "Wear Layer") {
					pViewModel.setProperty("/wearLayerVisible", true);
				} else if (selectedFilters[i].filter === "Installation") {
					pViewModel.setProperty("/installationVisible", true);
				} else if (selectedFilters[i].filter === "Backing") {
					pViewModel.setProperty("/backingVisible", true);
				} else if (selectedFilters[i].filter === "Description") {
					pViewModel.setProperty("/descriptionsVisible", true);
				} else if (selectedFilters[i].filter === "Application") {
					pViewModel.setProperty("/applicationVisible", true);
				} else if (selectedFilters[i].filter === "Technology") {
					pViewModel.setProperty("/technologyVisible", true);
				} else if (selectedFilters[i].filter === "Thickness") {
					pViewModel.setProperty("/thicknessVisible", true);
				}
			}
			var pViewData = pViewModel.getData();
			var sDialogTab = "filter";
			if (!this.byId("filter")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "cf.pricegrid.view.Filter",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					//

					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					oDialog.setModel(pViewModel, "pViewModel");
					oDialog.open(sDialogTab);
				}.bind(this));
			} else {

				this.byId("filter").setModel(pViewModel, "pViewModel");
				this.byId("filter").open(sDialogTab);
			}
		},

		handlePressClose: function () {
			this.byId("filter").close();
		},

		onCategoryChange: function (oEvent) {
			//Start of Pratik 10-16-2020
			// for global search issue 
			//this.selectedCat = oEvent.getSource().getSelectedKey();

			this.selectedCat = oEvent.getSource()._getSelectedItemText();

			if (this.selectedCat === "Solid Wood") {
				this.selectedCat = "SolidWood";
			}
			//End of Pratik 10-16-2020
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this._filterDisable();
			if (this.sortDialog) {
				this.sortDialog.destroy();
				delete this.sortDialog;
			}
			this.fetchProducts();
			//START of Sort Change - Pratik
			/*var oTable = this.byId("list"),
				oBinding = oTable.getBinding("items"),
				aSorters = [];
			aSorters.push(new Sorter("NAME", false));
			oBinding.sort(aSorters);*/
			//END of Sort Change - Pratik
		},

		onWhChange: function (oEvent) {
			this.selectedWH = oEvent.getSource().getSelectedKey();
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this.fetchProducts();
		},

		onBrandChange: function (oEvent) {
			this.selectedChannel = oEvent.getParameters().value;
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this.fetchProducts();
		},

		fetchProducts: function () {
			var brand = this.byId("brand").getModel("brandModel").getProperty("/allBrand");
			if (brand === undefined) {
				var brand = this.byId("brand2").getModel("brandModel").getProperty("/allBrand");
			}

			this.globalSearch = false;

			if (this.selectedChannel !== "" && this.selectedChannel !== null && this.selectedChannel !== undefined && this.selectedCat !==
				undefined) {
				this.filteredBrand = [];
				for (var i = 0; i < brand.length; i++) {
					if (brand[i].SALES_CHANNEL__C === this.selectedChannel) {
						this.filteredBrand.push(brand[i]);
					}
				}

				var localData = this.getOwnerComponent().getModel("local").getData();

				var that = this;
				// var pViewModel = new JSONModel();
				var pViewModel = this.getView().getModel("pViewModel");

				var urlBrand = "";

				for (var i = 0; i < this.filteredBrand.length; i++) {
					if (i === 0) {
						urlBrand = urlBrand + "and (BRAND_CODE__C eq '" + this.filteredBrand[i].BRAND_CODE__C + "' ";
					} else {
						urlBrand = urlBrand + "or BRAND_CODE__C eq '" + this.filteredBrand[i].BRAND_CODE__C + "' ";
					}
				}

				/*if (this.globalSearchField !== "" && this.globalSearchField !== undefined && this.globalSearchValue !== "" && this.globalSearchValue !==
					undefined) {

					var url = "pricing/PriceGrid.xsodata/ProductView?$filter=GRID_TYPE__C eq 'MBP' and SALESFORCE_PRODUCT_CATEGORY__C eq '" + this.selectedCat +
						"' and WAREHOUSE_CODE__C eq '" +
						this.selectedWH + "' " + urlBrand + ") and (" + this.globalSearchField + ") &$skip=" + this.fetchSkip +
						"&$top=" + this.fetchTotal + "&$format=json";*/

				/*if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
					var url = "pricing/Productview.xsjs?globalsearchKey=" + this.globalSearchValue +
						"&limit=" + this.fetchTotal + "&from=" + this.fetchSkip +
						"&$filter=GRID_TYPE__C eq 'MBP' and SALESFORCE_PRODUCT_CATEGORY__C eq '" + this.selectedCat +
						"' and WAREHOUSE_CODE__C eq '" + this.selectedWH + "' " + urlBrand + ")&$format=json";*/

				if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
					var url = "pricing/Productview.xsjs?Whcode=" + this.selectedWH + "&Gridtype=MBP&Productcategory=" + this.selectedCat +
						"&Brandcode=" + this.selectedChannel + "&globalsearchKey=" + this.globalSearchValue + "&limit=" + this.fetchTotal + "&from=" +
						this.fetchSkip + "&$format=json"

				} else {
					var url = "pricing/PriceGrid.xsodata/ProductView?$filter=GRID_TYPE__C eq 'MBP' and SALESFORCE_PRODUCT_CATEGORY__C eq '" + this.selectedCat +
						"' and WAREHOUSE_CODE__C eq '" +
						this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
				}

				if (this.selectedWH !== undefined & this.selectedWH !== '---') {
					$.ajax({
						url: url,
						contentType: "application/json",
						type: 'GET',
						dataType: "json",
						async: false,
						success: function (response) {
							// console.log(response.d.results);
							var data;
							if (response.d) {
								data = response.d.results;
							} else {
								data = response.results;
							}
							if (data.length < that.fetchTotal) {
								that.endResult = true;
							} else {
								that.endResult = false;
							}

							pViewModel.setData(data);
							var pViewData = data;
							for (var i = 0; i < pViewData.length; i++) {
								pViewData[i].SELLING_STYLE_CONCAT__C = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
								pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
								pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
								pViewData[i].INVENTORY_STYLE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C +
									")";
								pViewData[i].TM3_PRICE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C + ")";

							}

							// sort by name
							pViewData.sort(function (a, b) {
								var nameA = a.NAME.toUpperCase(); // ignore upper and lowercase
								var nameB = b.NAME.toUpperCase(); // ignore upper and lowercase
								if (nameA < nameB) {
									return -1;
								}
								if (nameA > nameB) {
									return 1;
								}

								// names must be equal
								return 0;
							});
							//var pViewData = pViewModel.getData();
							pViewModel.setData(pViewData);
							// that._bindFilters(pViewData, pViewModel);

							sap.ui.getCore().setModel(pViewModel, "pViewModel");
							that.getView().setModel(pViewModel, "pViewModel");

							that.bindRecords();
							that.getView().byId("sortButton").setEnabled(true);
							that.getView().byId("sortButton2").setEnabled(true);
						},
						error: function (error) {
							console.log(error);
							that.getView().byId("sortButton").setEnabled(false);
							that.getView().byId("sortButton2").setEnabled(false);
							//sap.m.MessageToast.show("Error");
							//return false;
						}
					});
				}

			}
		},

		bindRecords: function () {
			var pViewData = this.getView().getModel("pViewModel").getData();
			var oTable = this.getView().byId("list");
			oTable.removeAllItems();
			oTable.removeAllColumns();
			var tHeader = [];
			this.primaryCols = this.gridmeta.filter((a) => (a.IS_PRIMARY_DISPLAY__C == "X" && a[
				'PRODUCT_CATEGORY__C'] == this.selectedCat)).sort(this.sortGridMeta);
			for (var i = 0; i < this.primaryCols.length; i++) {
				var oColumn = new sap.m.Column({
					// width: this.primaryCols[i]['Column_Width__c'],
					header: new sap.m.Label({
						text: this.primaryCols[i]['SHORT_LABEL__C']
					})
				});
				oTable.addColumn(oColumn);
				// for Stock checkbox
				if (this.primaryCols[i]['SHORT_LABEL__C'] === "Stock") {
					var tData = {
						"key": this.primaryCols[i].PRIMARY_DISPLAY_ORDER__C,
						"header": this.primaryCols[i].SHORT_LABEL__C,
						"field": this.primaryCols[i].FIELD_API_NAME__C.toUpperCase(),
						"type": "Checkbox"
					};
				} else {
					var tData = {
						"key": this.primaryCols[i].PRIMARY_DISPLAY_ORDER__C,
						"header": this.primaryCols[i].SHORT_LABEL__C,
						"field": this.primaryCols[i].FIELD_API_NAME__C.toUpperCase(),
						"type": this.primaryCols[i].DATA_TYPE__C
					};
				}
				tHeader.push(tData);
			}
			sap.ui.getCore().getModel("configModel").setProperty("/mHeader", tHeader);
			sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", this.selectedCat);

			var numberFields = tHeader.filter(function (c) {
				if (c.type === "Currency") {
					return c;
				}
			});

			for (var i = 0; i < pViewData.length; i++) {
				for (var j = 0; j < numberFields.length; j++) {
					if (pViewData[i][numberFields[j].field] !== null && pViewData[i][numberFields[j].field] !== "") {
						pViewData[i][numberFields[j].field] = parseFloat(pViewData[i][numberFields[j].field]);
					}
				}
			}

			var oCell = [];

			//tHeader.sort(that.sortTHeader);
			for (var j = 0; j < tHeader.length; j++) {
				if (tHeader[j].type === "Currency") {
					var cell1 = new sap.m.Text({
						text: "$ " + "{pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				} else if (tHeader[j].type === "Checkbox") {
					var cell1 = new sap.m.CheckBox({
						selected: "{= ${pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "} === 'X'}",
						enabled: false
					});
					oCell.push(cell1);
				} else {
					var cell1 = new sap.m.Text({
						text: "{pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				}
			}
			var aColList = new sap.m.ColumnListItem({
				cells: oCell,
				type: "Navigation",
				press: [this.onSelectionChange, this]
			});
			oTable.bindItems("pViewModel>/", aColList);

			////////

			var oTable2 = this.getView().byId("list2");
			oTable2.removeAllItems();

			var listFilter = tHeader.filter(function (a) {
				return a.key == "1" || a.key == "2" || a.key == "3" || a.key == "4";
			});
			var lData = [];
			if (listFilter.length > 0) {
				for (var k = 0; k < pViewData.length; k++) {
					var f0 = listFilter[0].field.replace('PRODUCT__R.', '');
					var f1 = listFilter[1].field.replace('PRODUCT__R.', '');
					var f2 = listFilter[2].field.replace('PRODUCT__R.', '');
					var f3 = listFilter[3].field.replace('PRODUCT__R.', '');
					if (this.selectedCat === "Cushion") {
						var data = {
							"intro": pViewData[k][f0],
							"title": pViewData[k][f1],
							"number": pViewData[k][f2],
							"numUnit": pViewData[k][f3]
						};
					} else {
						var data = {
							"intro": pViewData[k][f2],
							"title": pViewData[k][f1],
							"number": pViewData[k][f0],
							"numUnit": pViewData[k][f3]
						};
					}
					lData.push(data);
				}
			}
			var lsModel = new JSONModel();

			lsModel.setData(lData);
			this.getView().setModel(lsModel, "listModel");
		},

		/*	_bindFilters: function (pViewData, pViewModel) {
				var brands = [{
						"key": 0,
						"brand": ""
					}],
					fibers = [{
						"key": 0,
						"fiber": ""
					}],
					fiberBrands = [{
						"key": 0,
						"fiberBrand": ""
					}],
					constructions = [{
						"key": 0,
						"construction": ""
					}],
					weights = [{
						"key": 0,
						"weight": ""
					}],
					collections = [{
						"key": 0,
						"collection": ""
					}],
					displayVehicles = [{
						"key": 0,
						"vehicle": ""
					}],
					categories = [{
						"key": 0,
						"category": ""
					}],
					density = [{
						"key": 0,
						"density": ""
					}],
					gauge = [{
						"key": 0,
						"gauge": ""
					}],
					size = [{
						"key": 0,
						"size": ""
					}],
					antimicrobial = [{
						"key": 0,
						"antimicrobial": ""
					}],
					moistureBarriers = [{
						"key": 0,
						"moBarrier": ""
					}],
					localStock = [{
						"key": 0,
						"stock": ""
					}],
					segments = [{
						"key": 0,
						"segment": ""
					}],
					widths = [{
						"key": 0,
						"width": ""
					}],
					species = [{
						"key": 0,
						"Species": ""
					}],
					textures = [{
						"key": 0,
						"texture": ""
					}],
					features = [{
						"key": 0,
						"feature": ""
					}],
					cores = [{
						"key": 0,
						"core": ""
					}],
					wearLayer = [{
						"key": 0,
						"layer": ""
					}],
					installation = [{
						"key": 0,
						"installation": ""
					}],
					backing = [{
						"key": 0,
						"backing": ""
					}],
					descriptions = [{
						"key": 0,
						"desc": ""
					}],
					application = [{
						"key": 0,
						"app": ""
					}],
					technology = [{
						"key": 0,
						"tech": ""
					}],
					thickness = [{
						"key": 0,
						"thick": ""
					}];

				for (var j = 0; j < pViewData.length; j++) {
					//Brand	
					if (pViewData[j].BRAND_CODE__C) {
						var tempBrand = {
							"key": j + 1,
							"brand": pViewData[j].BRAND_CODE__C
						};
						var brandAdded = false;
						for (var s = 0; s < brands.length; s++) {
							if (brands[s].brand === tempBrand.brand) {
								brandAdded = true;
							}
						}
						if (brandAdded === false) {
							brands.push(tempBrand);
						}
					}

					//Fiber
					if (pViewData[j].FIBER_TYPE__C) {
						var tempFiber = {
							"key": j + 1,
							"fiber": pViewData[j].FIBER_TYPE__C
						};
						var fiberAdded = false;
						for (var s = 0; s < fibers.length; s++) {
							if (fibers[s].fiber === tempFiber.fiber) {
								fiberAdded = true;
							}
						}
						if (fiberAdded === false) {
							fibers.push(tempFiber);
						}
					}

					//FiberBrand
					if (pViewData[j].FIBER_BRAND_CODE__C) {
						var tempFiberBrand = {
							"key": j + 1,
							"fiberBrand": pViewData[j].FIBER_BRAND_CODE__C
						};
						var fiberBrandAdded = false;
						for (var s = 0; s < fiberBrands.length; s++) {
							if (fiberBrands[s].fiberBrand === tempFiberBrand.fiberBrand) {
								fiberBrandAdded = true;
							}
						}
						if (fiberBrandAdded === false) {
							fiberBrands.push(tempFiberBrand);
						}
					}

					//Construction
					if (pViewData[j].FINISH__C) {
						var tempConstruction = {
							"key": j + 1,
							"construction": pViewData[j].FINISH__C
						};
						var constructionAdded = false;
						for (var s = 0; s < constructions.length; s++) {
							if (constructions[s].construction === tempConstruction.construction) {
								constructionAdded = true;
							}
						}
						if (constructionAdded === false) {
							constructions.push(tempConstruction);
						}
					}

					//Weight
					if (pViewData[j].FACE_WEIGH__C) {
						var tempWeight = {
							"key": j + 1,
							"weight": pViewData[j].FACE_WEIGH__C
						};
						var weightAdded = false;
						for (var s = 0; s < weights.length; s++) {
							if (weights[s].weight === tempWeight.weight) {
								weightAdded = true;
							}
						}
						if (weightAdded === false) {
							weights.push(tempWeight);
						}
					}

					//Collection
					if (pViewData[j].FACE_WEIGH__C) {
						var tempCollection = {
							"key": j + 1,
							"collection": pViewData[j].FACE_WEIGH__C // Check Value
						};
						var collectionAdded = false;
						for (var s = 0; s < collections.length; s++) {
							if (collections[s].collection === tempCollection.collection) {
								collectionAdded = true;
							}
						}
						if (collectionAdded === false) {
							collections.push(tempCollection);
						}
					}

					//Display Vehicle
					if (pViewData[j].DISPLAY__C) {
						var tempVehicle = {
							"key": j + 1,
							"vehicle": pViewData[j].DISPLAY__C
						};
						var vehicleAdded = false;
						for (var s = 0; s < displayVehicles.length; s++) {
							if (displayVehicles[s].vehicle === tempVehicle.vehicle) {
								vehicleAdded = true;
							}
						}
						if (vehicleAdded === false) {
							displayVehicles.push(tempVehicle);
						}
					}

					//Category
					if (pViewData[j].SUB_CATEGORY__C) {
						var tempCategory = {
							"key": j + 1,
							"category": pViewData[j].SUB_CATEGORY__C
						};
						var categoryAdded = false;
						for (var s = 0; s < categories.length; s++) {
							if (categories[s].category === tempCategory.category) {
								categoryAdded = true;
							}
						}
						if (categoryAdded === false) {
							categories.push(tempCategory);
						}
					}

					//Density
					if (pViewData[j].RESIDENTIAL_DENSITY__C) {
						var tempDensity = {
							"key": j + 1,
							"density": pViewData[j].RESIDENTIAL_DENSITY__C
						};
						var densityAdded = false;
						for (var s = 0; s < density.length; s++) {
							if (density[s].density === tempDensity.density) {
								densityAdded = true;
							}
						}
						if (densityAdded === false) {
							density.push(tempDensity);
						}
					}

					//Gauge
					if (pViewData[j].SIZE__C) {
						var tempGauge = {
							"key": j + 1,
							"gauge": pViewData[j].SIZE__C // Check Value
						};
						var gaugeAdded = false;
						for (var s = 0; s < gauge.length; s++) {
							if (gauge[s].gauge === tempGauge.gauge) {
								gaugeAdded = true;
							}
						}
						if (gaugeAdded === false) {
							gauge.push(tempGauge);
						}
					}

					//Size
					if (pViewData[j].SIZE__C) {
						var tempSize = {
							"key": j + 1,
							"size": pViewData[j].SIZE__C
						};
						var sizeAdded = false;
						for (var s = 0; s < size.length; s++) {
							if (size[s].size === tempSize.size) {
								sizeAdded = true;
							}
						}
						if (sizeAdded === false) {
							size.push(tempSize);
						}
					}

					//Antimicrobial
					if (pViewData[j].ANTIMICROBIAL__C) {
						var tempAntimicrobial = {
							"key": j + 1,
							"antimicrobial": pViewData[j].ANTIMICROBIAL__C
						};
						var antimicrobialAdded = false;
						for (var s = 0; s < antimicrobial.length; s++) {
							if (antimicrobial[s].antimicrobial === tempAntimicrobial.antimicrobial) {
								antimicrobialAdded = true;
							}
						}
						if (antimicrobialAdded === false) {
							antimicrobial.push(tempAntimicrobial);
						}
					}

					//Moisture Barriers
					if (pViewData[j].MOISTURE_BARRIER__C) {
						var tempMoBarrier = {
							"key": j + 1,
							"moBarrier": pViewData[j].MOISTURE_BARRIER__C
						};
						var moBarrierAdded = false;
						for (var s = 0; s < moistureBarriers.length; s++) {
							if (moistureBarriers[s].moBarrier === tempMoBarrier.moBarrier) {
								moBarrierAdded = true;
							}
						}
						if (moBarrierAdded === false) {
							moistureBarriers.push(tempMoBarrier);
						}
					}

					//Local Stock
					if (pViewData[j].LOCAL_STOCK__C) {
						var tempLocalStock = {
							"key": j + 1,
							"stock": pViewData[j].LOCAL_STOCK__C
						};
						var localStockAdded = false;
						for (var s = 0; s < localStock.length; s++) {
							if (localStock[s].stock === tempLocalStock.stock) {
								localStockAdded = true;
							}
						}
						if (localStockAdded === false) {
							localStock.push(tempLocalStock);
						}
					}

					//Segments
					if (pViewData[j].SEGMENT__C) {
						var tempSegment = {
							"key": j + 1,
							"segment": pViewData[j].SEGMENT__C
						};
						var segmentAdded = false;
						for (var s = 0; s < segments.length; s++) {
							if (segments[s].segment === tempSegment.segment) {
								segmentAdded = true;
							}
						}
						if (segmentAdded === false) {
							segments.push(tempSegment);
						}
					}

					//Width
					if (pViewData[j].SIZE_DESCRIPTION__C) {
						var tempWidth = {
							"key": j + 1,
							"width": pViewData[j].SIZE_DESCRIPTION__C //Check Value
						};
						var widthAdded = false;
						for (var s = 0; s < widths.length; s++) {
							if (widths[s].width === tempWidth.width) {
								widthAdded = true;
							}
						}
						if (widthAdded === false) {
							widths.push(tempWidth);
						}
					}

					//Species
					if (pViewData[j].SPECIES__C) {
						var tempSpecie = {
							"key": j + 1,
							"Species": pViewData[j].SPECIES__C
						};
						var speciesAdded = false;
						for (var s = 0; s < species.length; s++) {
							if (species[s].Species === tempSpecie.Species) {
								speciesAdded = true;
							}
						}
						if (speciesAdded === false) {
							species.push(tempSpecie);
						}
					}

					//Textures
					if (pViewData[j].TEXTURE__C) {
						var tempTexture = {
							"key": j + 1,
							"texture": pViewData[j].TEXTURE__C
						};
						var textureAdded = false;
						for (var s = 0; s < textures.length; s++) {
							if (textures[s].texture === tempTexture.texture) {
								textureAdded = true;
							}
						}
						if (textureAdded === false) {
							textures.push(tempTexture);
						}
					}

					//Feature
					if (pViewData[j].FEATURES__C) {
						var tempFeatures = {
							"key": j + 1,
							"feature": pViewData[j].FEATURES__C
						};
						var featureAdded = false;
						for (var s = 0; s < features.length; s++) {
							if (features[s].feature === tempFeatures.feature) {
								featureAdded = true;
							}
						}
						if (featureAdded === false) {
							features.push(tempFeatures);
						}
					}

					//Core
					if (pViewData[j].CORE_BODY__C) {
						var tempCores = {
							"key": j + 1,
							"core": pViewData[j].CORE_BODY__C
						};
						var coreAdded = false;
						for (var s = 0; s < cores.length; s++) {
							if (cores[s].core === tempCores.core) {
								coreAdded = true;
							}
						}
						if (coreAdded === false) {
							cores.push(tempCores);
						}
					}

					//Wear Layer
					if (pViewData[j].WEAR_LAYER__C) {
						var tempWearLayer = {
							"key": j + 1,
							"layer": pViewData[j].WEAR_LAYER__C
						};
						var layerAdded = false;
						for (var s = 0; s < wearLayer.length; s++) {
							if (wearLayer[s].layer === tempWearLayer.layer) {
								layerAdded = true;
							}
						}
						if (layerAdded === false) {
							wearLayer.push(tempWearLayer);
						}
					}

					//Installation
					if (pViewData[j].INSTALLATION_METHOD__C) {
						var tempInstallation = {
							"key": j + 1,
							"installation": pViewData[j].INSTALLATION_METHOD__C
						};
						var installationAdded = false;
						for (var s = 0; s < installation.length; s++) {
							if (installation[s].installation === tempInstallation.installation) {
								installationAdded = true;
							}
						}
						if (installationAdded === false) {
							installation.push(tempInstallation);
						}
					}

					//Backing
					if (pViewData[j].BACKING__C) {
						var tempBacking = {
							"key": j + 1,
							"backing": pViewData[j].BACKING__C
						};
						var backingAdded = false;
						for (var s = 0; s < backing.length; s++) {
							if (backing[s].backing === tempBacking.backing) {
								backingAdded = true;
							}
						}
						if (backingAdded === false) {
							backing.push(tempBacking);
						}
					}

					//Description
					if (pViewData[j].BACKING_DESCRIPTION__C) {
						var tempDesc = {
							"key": j + 1,
							"desc": pViewData[j].BACKING_DESCRIPTION__C
						};
						var descAdded = false;
						for (var s = 0; s < descriptions.length; s++) {
							if (descriptions[s].desc === tempDesc.desc) {
								descAdded = true;
							}
						}
						if (descAdded === false) {
							descriptions.push(tempDesc);
						}
					}

					//Application
					if (pViewData[j].BACKING_DESCRIPTION__C) {
						var tempApp = {
							"key": j + 1,
							"app": pViewData[j].BACKING_DESCRIPTION__C // check value
						};
						var appAdded = false;
						for (var s = 0; s < application.length; s++) {
							if (application[s].app === tempApp.app) {
								appAdded = true;
							}
						}
						if (appAdded === false) {
							application.push(tempApp);
						}
					}

					//Technology
					if (pViewData[j].TECHNOLOGY_APPLICATION__C) {
						var tempTech = {
							"key": j + 1,
							"tech": pViewData[j].TECHNOLOGY_APPLICATION__C
						};
						var techAdded = false;
						for (var s = 0; s < technology.length; s++) {
							if (technology[s].tech === tempTech.tech) {
								techAdded = true;
							}
						}
						if (techAdded === false) {
							technology.push(tempTech);
						}
					}

					//Thickness
					if (pViewData[j].THICKNESS__C) {
						var tempThick = {
							"key": j + 1,
							"thick": pViewData[j].THICKNESS__C
						};
						var thickAdded = false;
						for (var s = 0; s < thickness.length; s++) {
							if (thickness[s].thick === tempThick.thick) {
								thickAdded = true;
							}
						}
						if (thickAdded === false) {
							thickness.push(tempThick);
						}
					}
				}

				pViewModel.setProperty("/brands", brands);
				pViewModel.setProperty("/fibers", fibers);
				pViewModel.setProperty("/fiberBrands", fiberBrands);
				pViewModel.setProperty("/constructions", constructions);
				pViewModel.setProperty("/weights", weights);
				pViewModel.setProperty("/collections", collections);
				pViewModel.setProperty("/displayVehicles", displayVehicles);
				pViewModel.setProperty("/categories", categories);
				pViewModel.setProperty("/density", density);
				pViewModel.setProperty("/gauge", gauge);
				pViewModel.setProperty("/size", size);
				pViewModel.setProperty("/antimicrobial", antimicrobial);
				pViewModel.setProperty("/moistureBarriers", moistureBarriers);
				pViewModel.setProperty("/localStock", localStock);
				pViewModel.setProperty("/segments", segments);
				pViewModel.setProperty("/widths", widths);
				pViewModel.setProperty("/species", species);
				pViewModel.setProperty("/textures", textures);
				pViewModel.setProperty("/features", features);
				pViewModel.setProperty("/cores", cores);
				pViewModel.setProperty("/wearLayer", wearLayer);
				pViewModel.setProperty("/installation", installation);
				pViewModel.setProperty("/backing", backing);
				pViewModel.setProperty("/descriptions", descriptions);
				pViewModel.setProperty("/application", application);
				pViewModel.setProperty("/technology", technology);
				pViewModel.setProperty("/thickness", thickness);

			},*/

		onReset: function (oEvent) {
			this.getView().byId("wh").setSelectedKey("");
			this.getView().byId("wh2").setSelectedKey("");
			this.getView().byId("prodCat").setSelectedKey("");
			this.getView().byId("prodCat2").setSelectedKey("");
			this.getView().byId("brand").setSelectedKey("");
			this.getView().byId("brand2").setSelectedKey("");
			this.getView().byId("searchField").setValue("");
			this.getView().byId("searchField2").setValue("");
			this.getView().byId("searchField3").setValue("");
			var oModel = new JSONModel(this.warehouses);
			this.byId("wh").setModel(oModel, "warehouses");
			this.byId("wh2").setModel(oModel, "warehouses");
			var localData = this.proCat;
			var lModel = new JSONModel(localData);
			this.getView().setModel(lModel, "local");
			this.getView().byId("prodCat").setModel(lModel, "local");
			this.getView().byId("prodCat2").setModel(lModel, "local");
			// var scData = this.getView().getModel("brandModel").getProperty("/allChannel");
			// var oModel = new JSONModel(scData);
			this.getView().getModel("brandModel").setProperty("/allChannel", this.allSalesChnl);
			var oTable = this.getView().byId("list");
			oTable.removeAllItems();
			oTable.removeAllColumns();
			var oTable2 = this.getView().byId("list2");
			oTable2.removeAllItems();
			this.selectedChannel = "";
			this.selectedCat = "";
			this.selectedWH = "";
			// this.globalSearchField = "";
			this.globalSearchValue = "";
			if (this.sortDialog) {
				this.sortDialog.destroy();
				delete this.sortDialog;
			}
			this.getView().byId("sortButton").setEnabled(false);
			this.getView().byId("sortButton2").setEnabled(false);
		},

		fetchColNProd: function () {

		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},

		onGlobalSearch: function (oEvent) {
			if (oEvent.getParameters().clearButtonPressed) {
				this.onReset();
				return;
			}

			/*this.globalCols = this.gridmeta.filter((a) => (a.FIELD_LABEL__C == "Mstr #" || a.FIELD_LABEL__C ==
				"Master Style" || a.FIELD_LABEL__C == "Sell #" || a.FIELD_LABEL__C == "Selling Style" || a.FIELD_LABEL__C == "Brand") && (a.IS_PRIMARY_DISPLAY__C ==
				"X")).sort(this.sortGridMeta);

			var filters = [];
			for (var i = 0; i < this.globalCols.length; i++) {
				var tempF = {
					"key": i + 1,
					"field": this.globalCols[i].FIELD_API_NAME__C.toUpperCase()
				};
				var fAdded = "false";
				for (var j = 0; j < filters.length; j++) {
					if (filters[j].field === tempF.field) {
						fAdded = "true";
					}
				}
				if (fAdded === "false") {
					filters.push(tempF);
				}
			}

			for (var k = 0; k < filters.length; k++) {
				if (filters[k].field === 'PRODUCT__R.NAME') {
					filters[k].field = 'PRODUCT__R.PRODUCT_NAME__C';
				}
			}

			var header = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			for (var j = 0; j < filters.length; j++) {
				filters[j].field = filters[j].field.includes("PRODUCT__R.") ? filters[j].field.replace("PRODUCT__R.", "") : filters[j].field;
			}*/

			var that = this;
			var pViewModel = new JSONModel();
			var sQuery = oEvent.getParameter("query");
			sQuery = sQuery.toUpperCase();

			this.globalSearchValue = sQuery;
			var oTable = this.getView().byId("list");
			var oTable2 = this.getView().byId("list2");

			/*var urlFilter = "";
			for (var i = 0; i < filters.length; i++) {
				if (i === 0) {
					urlFilter = urlFilter + filters[i].field.toUpperCase() + " eq '" + sQuery + "'";
				} else {
					urlFilter = urlFilter + " or " + filters[i].field.toUpperCase() + " eq '" + sQuery + "'";
				}
			}

			this.globalSearchField = urlFilter;*/

			// var url = "pricing/PriceGrid.xsodata/ProductView?$filter=" + urlFilter + "&$format=json";
			var url = "pricing/GBSProductview.xsjs?globalsearchKey=" + sQuery + "&Gridtype=MBP&$format=json";

			if (sQuery && sQuery.length > 0) {
				$.ajax({
					url: url,
					contentType: "application/json",
					type: 'GET',
					dataType: "json",
					async: false,
					success: function (response) {

						/*pViewModel.setData(response.d.results);
						var pViewData = response.d.results;*/
						pViewModel.setData(response.results);
						var pViewData = response.results;
						for (var i = 0; i < pViewData.length; i++) {
							pViewData[i].SELLING_STYLE_CONCAT__C = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
							pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
							pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
							pViewData[i].INVENTORY_STYLE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C +
								")";
							pViewData[i].TM3_PRICE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C + ")";
							pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
							pViewData[i].INVENTORY_STYLE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C +
								")";
							pViewData[i].TM3_PRICE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C + ")";
						}
						sap.ui.getCore().setModel(pViewModel, "pViewModel");
						that.getView().setModel(pViewModel, "pViewModel");

						var whData = [{
							"key": 0,
							"WAREHOUSE_CODE__C": "",
							"WAREHOUSE_CODE__DESC": ""
						}];

						var proCatData = [{
							"key": 0,
							"name": ""
						}];

						var brandData = [];

						for (var j = 0; j < pViewData.length; j++) {
							var tempWH = {
								"key": j + 1,
								"WAREHOUSE_CODE__C": pViewData[j].WAREHOUSE_CODE__C,
								"WAREHOUSE_CODE__DESC": pViewData[j].WAREHOUSE_CODE__DESC
							};
							var whAdded = false;
							for (var s = 0; s < whData.length; s++) {
								if (pViewData[j].WAREHOUSE_CODE__C === whData[s].WAREHOUSE_CODE__C) {
									whAdded = true;
								}
							}
							if (whAdded === false) {
								whData.push(tempWH);
							}

							var tempProCat = {
								"key": j + 1,
								"name": pViewData[j].SALESFORCE_PRODUCT_CATEGORY__C
							};
							var proCatAdded = false;
							for (var s = 0; s < proCatData.length; s++) {
								if (pViewData[j].SALESFORCE_PRODUCT_CATEGORY__C === proCatData[s].name) {
									proCatAdded = true;
								}
							}
							if (proCatAdded === false) {
								proCatData.push(tempProCat);
							}

							var tempBrand = {
								"key": j + 1,
								"brand": pViewData[j].BRAND_CODE__C
							};
							var brandAdded = false;
							for (var s = 0; s < brandData.length; s++) {
								if (pViewData[j].BRAND_CODE__C === brandData[s].brand) {
									brandAdded = true;
								}
							}
							if (brandAdded === false) {
								brandData.push(tempBrand);
							}
						}

						// filter based on account no and search
						var filteredWH = [];
						for (var arr in whData) {
							for (var filter in that.warehouses) {
								if (that.warehouses[filter].WAREHOUSE_CODE__C == whData[arr].WAREHOUSE_CODE__C) {
									filteredWH.push(that.warehouses[filter]);
								}
							}
						}

						var whModel = new JSONModel(filteredWH);
						that.getView().setModel(whModel, "warehouses");
						that.getView().byId("wh").setModel(whModel, "warehouses");
						that.getView().byId("wh").setSelectedKey(0);
						that.getView().byId("wh2").setModel(whModel, "warehouses");
						that.getView().byId("wh2").setSelectedKey(0);
						// that.getView().getModel("warehouses").refresh();

						var proCategory = {
							"ProductCategory": proCatData
						};
						var catModel = new JSONModel(proCategory);
						that.getView().setModel(catModel, "local");
						that.getView().byId("prodCat").setModel(catModel, "local");
						that.getView().byId("prodCat2").setModel(catModel, "local");
						that.getView().byId("prodCat").setSelectedKey(0);
						that.getView().byId("prodCat2").setSelectedKey(0);

						var allBrands = that.getView().byId("brand").getModel("brandModel").getProperty("/allBrand");
						if (allBrands === undefined) {
							allBrands = that.getView().byId("brand2").getModel("brandModel").getProperty("/allBrand");
						}
						/*var temSales = [{
							"key": 0,
							"channel": ""
						}];

						for (var i = 0; i < brandData.length; i++) {
							var chnlAdded = false;
							for (var k = 0; k < allBrands.length; k++) {
								if (brandData[i].brand === allBrands[k].BRAND_CODE__C) {
									for (var l = 0; l < temSales.length; l++) {
										if (temSales[l].SALES_CHANNEL__C === allBrands[k].SALES_CHANNEL__C) {
											chnlAdded = true;
										}
									}
									if (chnlAdded === false) {
										var tempBrand = {
											"key": i + 1,
											"channel": allBrands[k].SALES_CHANNEL__C
										};
										temSales.push(tempBrand);
									}
								}
							}
						}*/

						var filteredBrand = [];
						for (var arr in allBrands) {
							for (var filter in brandData) {
								if (brandData[filter].brand == allBrands[arr].BRAND_CODE__C) {
									filteredBrand.push(allBrands[arr]);
								}
							}
						}

						var temSales = [{
							"key": 0,
							"channel": ""
						}];
						for (var j = 0; j < filteredBrand.length; j++) {
							var tempBrand = {
								"key": j + 1,
								"channel": filteredBrand[j].SALES_CHANNEL__C
							};
							var channelAdded = false;
							for (var s = 0; s < temSales.length; s++) {
								if (temSales[s].channel === tempBrand.channel) {
									channelAdded = true;
								}
							}
							if (channelAdded === false) {
								temSales.push(tempBrand);
							}
						}

						// var oModel = new JSONModel(temSales);
						that.getView().getModel("brandModel").setProperty("/allChannel", temSales);
						that.getView().byId("brand").setSelectedKey(0);
						that.getView().byId("brand2").setSelectedKey(0);

						that.selectedCat = "";
						that.selectedWH = "";
						that.selectedChannel = "";

						oTable.removeAllItems();
						oTable.removeAllColumns();

						oTable2.removeAllItems();

						// that.bindRecords();
					},
					error: function (error) {
						console.log(error);
						//sap.m.MessageToast.show("Error");
						//return false;
					}
				});
			}

		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var header = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width > 700) {
				var f0 = header[0].field.includes("PRODUCT__R.") ? header[0].field.replace("PRODUCT__R.", "") : header[0].field;
				var f1 = header[1].field.includes("PRODUCT__R.") ? header[1].field.replace("PRODUCT__R.", "") : header[1].field;
				var f2 = header[2].field.includes("PRODUCT__R.") ? header[2].field.replace("PRODUCT__R.", "") : header[2].field;
				var f3 = header[3].field.includes("PRODUCT__R.") ? header[3].field.replace("PRODUCT__R.", "") : header[3].field;
			} else {
				var f0 = "intro";
				var f1 = "title";
				var f2 = "number";
				var f3 = "numUnit";
			}
			var aFilters = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery && sQuery.length > 0) {
				var filter1 = new Filter(f0, FilterOperator.Contains, sQuery);
				var filter2 = new Filter(f1, FilterOperator.Contains, sQuery);
				var filter3 = new Filter(f2, FilterOperator.Contains, sQuery);
				var filter4 = new Filter(f3, FilterOperator.Contains, sQuery);
				aFilters.push(filter1, filter2, filter3, filter4);

				var oFilter = new Filter(aFilters);

				// update list binding
				var oList = this.byId("list");
				var oBinding = oList.getBinding("items");
				oBinding.filter(oFilter, "Application");
				// update list binding
				var oList2 = this.byId("list2");
				var oBinding2 = oList2.getBinding("items");
				oBinding2.filter(oFilter, "Application");
			} else {
				this.bindRecords();

				/*	var oModel = new JSONModel(this.masterData);
					this.byId("list").setModel(oModel, "MasterModel");
					this.getModel("MasterModel").refresh();*/
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			this._oList.getBinding("items").refresh();
			this.setModel(this.oModel, "MasterModel");
			this.getModel("MasterModel").refresh();
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onSortDialogForPhone: function (oEvent) {
			var sDialogTab = "sort";
			var oList2 = this.getView().byId("list2");

			// load asynchronous XML fragment
			if (!this.sortDialog) {
				this.sortDialog = sap.ui.xmlfragment("cf.pricegrid.view.ViewSettingsDialog", this);
				this.getView().addDependent(this.sortDialog);

				var items = [{
						"key": "number",
						"text": "Mstr #"
					}, {
						"key": "title",
						"text": "Master Style"
					}, {
						"key": "intro",
						"text": "Sell #"
					}, {
						"key": "numUnit",
						"text": "Selling Style"
					}

				]

				for (var i = 0; i < items.length; i++) {
					var oCustomSortItem = new sap.m.ViewSettingsItem({
						key: items[i].key,
						text: items[i].text
					});
					this.sortDialog.addSortItem(oCustomSortItem);
				}
			}
			this.sortDialog.open();
		},
		
		onSortDialog: function (oEvent) {
			var sDialogTab = "sort";

			var headerData = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");

			// load asynchronous XML fragment
			if (!this.sortDialog) {
				this.sortDialog = sap.ui.xmlfragment("cf.pricegrid.view.ViewSettingsDialog", this);
				this.getView().addDependent(this.sortDialog);
				for (var i = 0; i < headerData.length; i++) {
					headerData[i].field = headerData[i].field.includes("PRODUCT__R.") ? headerData[i].field.replace("PRODUCT__R.", "") : headerData[
							i]
						.field;
					var oCustomSortItem = new sap.m.ViewSettingsItem({
						key: headerData[i].field,
						text: headerData[i].header
					});
					this.sortDialog.addSortItem(oCustomSortItem);
				}

				if (Device.system.desktop) {
					this.sortDialog.addStyleClass("sapUiSizeCompact");
				}
			}
			this.sortDialog.open();
		},

		handleConfirm: function (oEvent) {
			if (Device.system.phone) {
				var oTable2 = this.byId("list2"),
					mParams = oEvent.getParameters(),
					oBinding2 = oTable2.getBinding("items"),
					sPath,
					bDescending,
					aSorters = [];

				sPath = mParams.sortItem.getKey();
				bDescending = mParams.sortDescending;
				aSorters.push(new Sorter(sPath, bDescending));

				oBinding2.sort(aSorters);
			} else {
				var oTable = this.byId("list"),
					mParams = oEvent.getParameters(),
					oBinding = oTable.getBinding("items"),
					sPath,
					bDescending,
					aSorters = [];

				sPath = mParams.sortItem.getKey();
				bDescending = mParams.sortDescending;
				aSorters.push(new Sorter(sPath, bDescending));

				// apply the selected sort and group settings
				oBinding.sort(aSorters);
			}

		},

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
		 * are applied to the master list, which can also mean that they
		 * are removed from the master list, in case they are
		 * removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog: function (oEvent) {
			var aFilterItems = oEvent.getParameters().filterItems,
				aFilters = [],
				aCaptions = [];

			// update filter state:
			// combine the filter array and the filter string

			/*this._oListFilterState.aFilter = aFilters;
			this._updateFilterBar(aCaptions.join(", "));
			this._applyFilterSearch();*/
			// this._applySortGroup(oEvent);
		},

		/**
		 * Apply the chosen sorter and grouper to the master list
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @private
		 */

		/*applySortGroup: function (oEvent) {
					var mParams = oEvent.getParameters(),
						sPath,
						bDescending,
						aSorters = [];
					// apply sorter to binding
					// (grouping comes before sorting)
					if (mParams.groupItem) {
						sPath = mParams.groupItem.getKey();
						bDescending = mParams.groupDescending;
						// var vGroup = this._oGroupFunctions[sPath];
						// aSorters.push(new Sorter(sPath, bDescending, vGroup));
					}
					sPath = mParams.sortItem.getKey();
					bDescending = mParams.sortDescending;
					aSorters.push(new Sorter(sPath, bDescending));
					this._oList.getBinding("items").sort(aSorters);
				},*/

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function (oEvent) {
			// console.log(oEvent);
			// console.log(this);
			// var width = oEvent.getSource()._oContextualSettings.contextualWidth;
			// if(width > 700) {
			this.getView().byId("masterPage").setVisible(false);
			this.getView().byId("masterPage2").setVisible(true);
			this._oList = this.byId("list2");
			/*this.path = oEvent.getParameters().id.split("list")[1];
			if (!this.path) {
				this.path = oEvent.getParameters().id.split("clone")[1];
			}*/
			// } else {
			// this._oList = this.byId("list2");
			// this.getView().byId("masterPage2").setVisible(true);
			// this.getView().byId("masterPage").setVisible(false);
			// }
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function (oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_createViewModel: function () {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Mstr#",
				groupBy: "None"
			});
		},

		_onMasterMatched: function (oEvent) {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width > 700) {
				this._oList = this.byId("list");
				this.getView().byId("masterPage2").setVisible(false);
				this.getView().byId("masterPage").setVisible(true);
				this.getView().byId("searchField3").setValue("");
				this.bindRecords();
			} else {
				this._oList = this.byId("list2");
				this.getView().byId("masterPage2").setVisible(true);
				this.getView().byId("masterPage").setVisible(false);
			}
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			// var path = this.path;
			var priceData = this.getView().getModel("pViewModel").getData();
			var headerData = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			var h0 = headerData[0].field.includes("PRODUCT__R.") ? headerData[0].field.replace("PRODUCT__R.", "") : headerData[0].field;
			var h1 = headerData[1].field.includes("PRODUCT__R.") ? headerData[1].field.replace("PRODUCT__R.", "") : headerData[1].field;
			var h2 = headerData[2].field.includes("PRODUCT__R.") ? headerData[2].field.replace("PRODUCT__R.", "") : headerData[2].field;
			var h3 = headerData[3].field.includes("PRODUCT__R.") ? headerData[3].field.replace("PRODUCT__R.", "") : headerData[3].field;

			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width) {
				if (width < 700) {
					var that = this;
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						if (that.selectedCat === "Cushion") {
							return a[h2] === oItem.getNumber() && a[h1] === oItem.getTitle() && a[h0] === oItem
								.getIntro() && a[h3] === oItem.getNumberUnit();
						} else {
							return a[h0] === oItem.getNumber() && a[h1] === oItem.getTitle() && a[h2] === oItem
								.getIntro() && a[h3] === oItem.getNumberUnit();
						}
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getIntro()
					}, bReplace);
				} else {
					var that = this;
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						/*if (that.selectedCat === "Cushion") {
							return a[h2] === oItem.getAggregation("cells")[0].getText() && a[h1] === oItem.getAggregation("cells")[1].getText() && a[
								h0] === oItem.getAggregation("cells")[2].getText() && a[h3] === oItem.getAggregation("cells")[3].getText();
						} else {*/
						return a[h0] === oItem.getAggregation("cells")[0].getText() && a[h1] === oItem.getAggregation("cells")[1].getText() && a[
							h2] === oItem.getAggregation("cells")[2].getText() && a[h3] === oItem.getAggregation("cells")[3].getText();
						// }
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getAggregation("cells")[0].getText()
							// path: path
					}, bReplace);
				}
			} else {
				var that = this;
				if (this.getView().byId("masterPage2").getVisible()) {
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						if (that.selectedCat === "Cushion") {
							return a[h2] === oItem.getNumber() && a[h1] === oItem.getTitle() && a[h0] === oItem
								.getIntro() && a[h3] === oItem.getNumberUnit();
						} else {
							return a[h0] === oItem.getNumber() && a[h1] === oItem.getTitle() && a[h2] === oItem
								.getIntro() && a[h3] === oItem.getNumberUnit();
						}
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getIntro()
					}, bReplace);
				} else {
					var that = this;
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						/*if (that.selectedCat === "Cushion") {
							return a[h2] === oItem.getAggregation("cells")[0].getText() && a[h1] === oItem.getAggregation("cells")[1].getText() && a[
								h0] === oItem.getAggregation("cells")[2].getText() && a[h3] === oItem.getAggregation("cells")[3].getText();
						} else {*/
						return a[h0] === oItem.getAggregation("cells")[0].getText() && a[h1] === oItem.getAggregation("cells")[1].getText() && a[
							h2] === oItem.getAggregation("cells")[2].getText() && a[h3] === oItem.getAggregation("cells")[3].getText();
						// }
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getAggregation("cells")[0].getText()
							// path: path
					}, bReplace);
				}
			}

			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
			/*if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}*/
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		/*_applyFilterSearch: function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},*/

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		/*_updateFilterBar: function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},*/
		sortGridMeta: function (objA, objB) {
			if (objA['PRIMARY_DISPLAY_ORDER__C'] === undefined || objB['PRIMARY_DISPLAY_ORDER__C'] === undefined) return 1;
			let objectA = objA['PRIMARY_DISPLAY_ORDER__C'];
			let objectB = objB['PRIMARY_DISPLAY_ORDER__C'];
			if (objectA == undefined || objectB == undefined) return 0;
			else return objectA - objectB;
		},
		/*sortTHeader: function (objA, objB) {
			return objA.key - objB.key;
		},*/
		loadOnScroll: function (e) {
			if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
				console.log('This is the bottom of the container');
				if (this.globalSearch === false) {
					if (e.data.that.endResult === false) {
						e.data.that.fetchTotal = e.data.g.fetchTotal + 100;
						e.data.that.fetchSkip = e.data.g.fetchSkip + 100;
						e.data.that.fetchProducts();
					}
				}
			}
		}
	});

});