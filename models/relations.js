const AccidentReport = require("./AccidentReport");
const AccidentReportMainImages = require("./AccidentReportMainImages");
const AccidentType = require("./AccidentType");
const AccidentTypesAndReports = require("./AccidentTypesAndReports");
const Broker = require("./Broker");
const Branches = require("./Branches");
const Car = require("./Car");
const CarAccidentReports = require("./CarAccidentReports");
const CarModel = require("./CarModel");
const CarServiceType = require("./CarServiceType");
const Corporate = require("./Corporate");
const CorporateCompany = require("./CorporateCompany");
const CorporateDeals = require("./CorporateDeals.js");
const Client = require("./Client");
const ClientPackage = require("./ClientPackage");
const CheckTimes = require("./CheckTimes");
const CarPackage = require("./CarPackage");
const Cities = require("./Cities");
const Districts = require("./Districts");
const Driver = require("./Driver");
const Insurance = require("./Insurance");
const InsuranceCompany = require("./InsuranceCompany");
const InsuranceCompanyReport = require("./InsuranceCompanyReport");
const IntegrationUser = require("./IntegrationUsers");
const IntegrationToken = require("./IntegrationTokens");
const Inspector = require("./Inspector");
const Inspections = require("./Inspections.js");
const InspectionsReports = require("./InspectionsReports.js");
const InspectionCompany = require("./InspectionCompany");
const InspectionInsurance = require("./InspectionInsurance");
const InspectionManager = require("./InspectionManager");
const InspectionManagerInspection = require("./InspectionManagerInspection");
const InspectorInsurance = require("./InspectorInsurance");
const InspectorInspection = require("./InspectorInspection");
const Manufacturer = require("./Manufacturer");
const Package = require("./Package");
const PDFReport = require("./PDFReport");
const PromoCode = require("./PromoCode");
const PackagePromoCode = require("./PackagePromoCode");
const HistoryLogs = require("./historyLogs");
const PromoCodeUser = require("./PromoCodeUser");
const PackageBenefits = require("./PackageBenefits");
const PackageCustomization = require("./PackageCustomization");
const PackageTransactions = require("./PackageTransactions");
const Rating = require("./Rating");
const Roles = require("./Roles");
const ServiceRequest = require("./ServiceRequest");
const ServiceRequestDriver = require("./ServiceRequestDriver");
const ServiceRequestPhotos = require("./ServiceRequestPhotos");
const Setting = require("./Settings");
const Types = require("./Types");
const User = require("./User");
const UsedPromosPackages = require("./UsedPromosPackages");
const Vehicle = require("./Vehicle");
const VehicleType = require("./VehicleType");
const Wizard = require("./Wizard");

const { DataTypes } = require("sequelize");
// const sequelize = require("sequelize");

// Accidents
AccidentType.belongsToMany(AccidentReport, {
   through: AccidentTypesAndReports,
});
AccidentReport.belongsToMany(AccidentType, {
   through: AccidentTypesAndReports,
   foreignKey: "AccidentReportId",
});
AccidentReport.hasMany(AccidentReportMainImages, {
   foreignKey: "accidentReportId",
   as: "images",
});
AccidentReportMainImages.belongsTo(AccidentReport, {
   foreignKey: "accidentReportId",
});
AccidentReport.belongsTo(Car, { foreignKey: "carId" });
AccidentReport.belongsTo(User, { foreignKey: "createdByUser" });
AccidentReport.belongsTo(Client, { foreignKey: "clientId" });
AccidentReport.belongsTo(Inspector, { foreignKey: "InspectorId" });
AccidentReport.belongsTo(InspectionCompany, {
   foreignKey: "inspectionCompanyId",
});
AccidentReport.belongsTo(InsuranceCompany, {
   foreignKey: "insuranceCompanyId",
});
AccidentReport.hasMany(CarAccidentReports, { foreignKey: "AccidentReportId" });
Broker.belongsTo(User, { onDelete: "cascade" });
//
Branches.belongsTo(CorporateCompany, {
   foreignKey: "CorporateCompanyId",
   onDelete: "cascade",
});
CorporateCompany.hasMany(Branches);
ServiceRequest.belongsTo(Branches);
Branches.hasMany(ServiceRequest);

CarAccidentReports.belongsTo(PDFReport, { foreignKey: "pdfReportId" });

CorporateCompany.hasMany(CorporateDeals, { onDelete: "cascade" });
CorporateDeals.belongsTo(CorporateCompany, { onDelete: "cascade" });
Package.hasMany(CorporateDeals, { onDelete: "cascade" });
CorporateDeals.belongsTo(Package, { onDelete: "cascade" });
Car.belongsTo(Manufacturer);
Car.belongsTo(Client, { onDelete: "cascade" });
Car.belongsToMany(Client, { through: "Members" });
Car.belongsTo(CarModel);
Car.belongsTo(InsuranceCompany, { foreignKey: { allowNull: true } });
Car.belongsTo(
   User,
   { foreignKey: "CreatedBy", allowNull: true },
   { onDelete: "cascade" }
);
Car.belongsTo(Broker, {
   onDelete: "cascade",
   foreignKey: {
      name: "BrokerId",
      allowNull: true,
   },
});

Districts.belongsTo(Cities, {
   foreignKey: { allowNull: false, name: "CityId" },
});

CarModel.belongsTo(Manufacturer);

Client.belongsTo(User, { onDelete: "cascade" });
Client.hasMany(Car, { as: "cars" });

Corporate.belongsTo(User, { onDelete: "cascade" });
CorporateCompany.hasMany(Corporate);
Corporate.belongsTo(CorporateCompany);

Driver.belongsTo(User, { onDelete: "cascade" });
Driver.hasMany(Vehicle, { foreignKey: { name: "Active_Driver" } });

Insurance.belongsTo(User, { onDelete: "cascade" });
Insurance.belongsTo(InsuranceCompany);

Inspector.belongsTo(User, { onDelete: "cascade" });
Inspector.belongsToMany(InsuranceCompany, {
   through: InspectorInsurance,
   as: "InspectorId",
});
Inspector.belongsToMany(InspectionCompany, { through: InspectorInspection });
InsuranceCompany.belongsToMany(Inspector, { through: InspectorInsurance });
InspectionCompany.belongsToMany(Inspector, { through: InspectorInspection });

InspectionCompany.belongsToMany(InsuranceCompany, {
   through: InspectionInsurance,
});
InsuranceCompany.belongsToMany(InspectionCompany, {
   through: InspectionInsurance,
});

// InspectionCompany.belongsToMany(InspectionManager, {through:InspectionManagerInspection})
InspectionManager.belongsTo(InspectionCompany);
InspectionManager.belongsTo(User, { onDelete: "cascade" });

InsuranceCompany.hasMany(Insurance, { foreignKey: "insuranceCompanyId" });
InsuranceCompany.hasMany(AccidentReport, { foreignKey: "insuranceCompanyId" });
InsuranceCompany.hasMany(Car, { foreignKey: "insuranceCompanyId" });

Manufacturer.hasMany(CarModel, { as: "models" });
Manufacturer.hasMany(Car);

// User.belongsTo(Roles);
// Roles.hasMany(User);

ServiceRequest.belongsToMany(Rating, { through: "ServiceRequestRating" });

InsuranceCompanyReport.belongsTo(InsuranceCompany);
InsuranceCompanyReport.belongsTo(Car);

Inspections.belongsTo(Manufacturer, { foreignKey: "carBrand" });
Inspections.belongsTo(CarModel, { foreignKey: "carModel" });
Inspections.belongsTo(Inspector, { foreignKey: "inspectorId" });
Inspections.belongsTo(InspectionCompany, { foreignKey: "inspectionCompanyId" });
Inspections.belongsTo(InsuranceCompany, { foreignKey: "insuranceCompanyId" });
Inspections.belongsTo(AccidentReport);
Inspections.hasMany(InspectionsReports, { foreignKey: "InspectionId" });

Package.belongsToMany(Car, { through: CarPackage });
ClientPackage.belongsTo(Package);
Package.hasMany(ClientPackage);
Client.hasMany(ClientPackage);
ClientPackage.belongsTo(Client);
ClientPackage.hasMany(CarPackage);
CarPackage.belongsTo(ClientPackage);
ServiceRequest.belongsTo(ClientPackage, { allowNull: true });
Package.hasMany(PackageBenefits, { foreignKey: "packageId" });
Car.hasMany(CarPackage);
CarPackage.belongsTo(Car);
ClientPackage.belongsToMany(Car, { through: CarPackage });
CarPackage.belongsTo(Car);
Car.belongsToMany(ClientPackage, { through: CarPackage });
CarPackage.belongsTo(Package);

Package.belongsTo(InsuranceCompany, {
   foreignKey: "insuranceCompanyId",
   allowNull: true,
});
Package.belongsTo(Broker, {
   foreignKey: "BrokerId",
   allowNull: true,
});
Package.belongsTo(CorporateCompany, {
   foreignKey: "corporateCompanyId",
   allowNull: true,
});

PackageCustomization.belongsTo(Package, { allowNull: true });
Package.hasMany(PackageCustomization);

ServiceRequest.belongsTo(CorporateCompany, { allowNull: true });
CorporateCompany.hasMany(ServiceRequest);
ServiceRequest.belongsToMany(CarServiceType, { through: Types });
CarServiceType.belongsToMany(ServiceRequest, { through: Types });
ServiceRequest.belongsTo(Car);
ServiceRequest.belongsTo(User, { foreignKey: "createdByUser" });
ServiceRequest.belongsTo(Client, { foreignKey: "clientId" });
ServiceRequest.belongsTo(Driver);
// ServiceRequest.belongsTo(Driver, {
//    foreignKey: "driverRejectId",
//    allowNull: true,
// });
ServiceRequest.belongsTo(Vehicle);
ServiceRequest.hasMany(ServiceRequestPhotos, {
   foreignKey: "serviceRequestId",
});
ServiceRequest.belongsTo(PromoCodeUser);
PromoCodeUser.hasMany(ServiceRequest);
Driver.hasMany(ServiceRequest);

Vehicle.belongsToMany(CarServiceType, {
   allowNull: false,
   through: "VehicleServiceTypes",
});
CarServiceType.belongsTo(VehicleType, { foreignKey: "car_type" });
Vehicle.belongsTo(VehicleType, { foreignKey: "Vec_type" });

PackageTransactions.belongsTo(Package);
PackageTransactions.belongsTo(User);
ClientPackage.belongsTo(PackageTransactions, { foreignKey: "orderId" });
PromoCode.belongsToMany(User, { through: PromoCodeUser });
User.belongsToMany(PromoCode, { through: PromoCodeUser });

CheckTimes.belongsTo(User);
IntegrationUser.hasOne(IntegrationToken, {
   foreignKey: "ClientId",
   keyType: DataTypes.STRING,
});
Vehicle.belongsTo(Driver, {
   foreignKey: { name: "Active_Driver", allowNull: true },
});
ClientPackage.hasMany(UsedPromosPackages);

// IntegrationToken.belongsTo(User, { foreignKey: "ClientId" });

module.exports = async function (db) {
   db.sync()
      .then((result) => {
         console.info("result");
      })
      .catch((err) => {
         console.error(err);
      });
};
