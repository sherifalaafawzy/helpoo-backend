const cron = require("node-cron");
const axios = require("axios");
const { Op } = require("sequelize");
const Car = require("../models/Car");
const User = require("../models/User");
const Client = require("../models/Client");
const Manufacturer = require("../models/Manufacturer");
const smsService = require("../services/smsService");
const CarModel = require("../models/CarModel");
const InsuranceCompany = require("../models/InsuranceCompany");
const relations = require("../models/relations");
const https = require("https");
const packageService = require("../services/packageService");
const moment = require("moment");
const bcrypt = require("bcryptjs");
const userService = require("../services/userService");
const clientPackageService = require("../services/ClientPackageService");

const alf = ["ا", "أ", "إ", "آ"];
const yaa = ["ي", "ى", "ئ"];
const haa = ["ه", "ة"];
const wow = ["ؤ", "و"];

async function updateCar(data) {
   let car = await Car.findOne({
      where: {
         [Op.or]: {
            vin_number: data.vinNumber,
            plateNumber: data.plateNumber,
         },
         policyNumber: data.policyNumber,
      },
   });
   if (!car) {
      const newCar = await addCar(data);
   } else
      await Car.update(
         {
            vin_number: data.vinNumber,
            year: data.year,
            plateNumber: data.plateNumber,
            policyStarts: data.polStart,
            policyEnds: data.polEnd,
         },
         {
            where: {
               [Op.or]: {
                  vin_number: data.vinNumber,
                  plateNumber: data.plateNumber,
               },
               policyNumber: data.policyNumber,
            },
         }
      );
}

async function addCar(data) {
   let manufacturerId;
   let carModelId;
   let userId;
   // let client;
   try {
      const insurance = await InsuranceCompany.findOne({
         where: {
            en_name: {
               [Op.like]: "Delta",
            },
         },
      });
      if (data.manufacturer) {
         let manufacturer = await Manufacturer.findOne({
            where: {
               en_name: {
                  [Op.like]: `%${data.manufacturer}%`,
               },
            },
         });
         if (manufacturer) {
            manufacturerId = manufacturer.id;
         }
      }
      // if(data.carModel){
      //     let carModel = await CarModel.findOne({
      //         en_name:{
      //             [Op.like]:`%${data.carModel}%`
      //         }
      //     })
      //     if(carModel){
      //         carModelId = carModel.id
      //     }
      // }
      if (data.PhoneNumber) {
         let checkUser = await User.findOne({
            where: {
               username: data.PhoneNumber,
            },
         });
         if (checkUser) {
            let getClient = await Client.findOne({
               where: {
                  UserId: checkUser.id,
               },
            });
            userId = getClient.id;
         } else {
            let userData = {
               identifier: data.PhoneNumber,
               name: data.name,
            };
            let user = await userService.createUser(userData);
            userId = user.id;
         }
      }
      const car = await Car.create({
         ClientId: userId,
         ManufacturerId: manufacturerId,
         CarModelId: carModelId,
         insuranceCompanyId: insurance.id,
         plateNumber: data.plateNumber,
         year: data.year,
         policyNumber: data.policyNumber,
         policyStarts: data.polStart,
         policyEnds: data.polEnd,
         vin_number: data.vinNumber,
         policyCanceled: false,
         active: false,
      });

      if (car && data.PhoneNumber) {
         const date = moment(car.policyEnds).format("YYYY/MM/DD");

         const sendSms = await smsService.sendSms({
            mobile: data.PhoneNumber,
            message: `تم اصدار وثيقة تأمين رقم ${car.policyNumber} من قبل شركة ${insurance.ar_name} للتأمين صالحة حتى تاريخ ${date}`,
         });
         const sendSms2 = await smsService.sendSms({
            mobile: data.PhoneNumber,
            message: `برجاء تحميل برنامج هلبو لخدمات الطريق و عمل اخطار الحادث من خلال الرابط التالي helpoo.co`,
         });
         const sendSms3 = await smsService.sendSms({
            mobile: data.PhoneNumber,
            message: `تسهيلا لسيادتكم، برجاء عمل الاخطار في حالة حدوث تلفيات، فور وقوعها، من خلال تطبيق هلبو او الاتصال علي 17000`,
         });
      }
      if (car && userId) {
         const existPackage = await packageService.findPackageByInsuranceId(
            insurance.id
         );
         if (existPackage.statusCode) return car;
         const subscribedClient = await clientPackageService.subscribe({
            PackageId: existPackage.id,
            ClientId: userId,
            paymentMethod: "pre-paid",
         });
         if (subscribedClient.statusCode) return car;
         const subscribeCar = await clientPackageService.subscribeCarPackage({
            carId: car.id,
            packageId: existPackage.id,
            clientId: userId,
            clientPackageId: subscribedClient.id,
         });
         if (subscribeCar.statusCode) return car;
         return car;
      }
      return car;
   } catch (err) {
      console.error(err.message);
      return null;
   }
}

const getAndSaveCars = cron.schedule("0 20 * * *", async () => {
   console.info(`Starting At ${moment().format("YYYY/MM/DD-h:mm:ss a")}`);
   try {
      const token = await axios.request({
         url: "https://196.219.199.172:8443/ords/delta_portal/oauth/token",
         method: "post",
         timeout: 200000,
         auth: {
            username: "pL8TEOOZWFZbMWIl8HQN5A..",
            password: "5rDtWUkFSXM0GlavydDF2w..",
         },
         params: {
            grant_type: "client_credentials",
         },
         httpsAgent: new https.Agent({
            rejectUnauthorized: false,
         }),
      });
      console.info("token: " + token.data);
      try {
         let items = await axios.get(
            "https://196.219.199.172:8443/ords/delta_portal/helpooapi/GetPolicy",
            {
               headers: {
                  Authorization: `Bearer ${token.data.access_token}`,
               },
               httpsAgent: new https.Agent({
                  rejectUnauthorized: false,
               }),
            }
         );
         let cars = items.data.items;
         const addCarss = await loopOnCarsPerPage(cars);
         while (items.data.next) {
            items = await axios.get(`${items.data.next.$ref}`, {
               headers: {
                  Authorization: `Bearer ${token.data.access_token}`,
               },
               httpsAgent: new https.Agent({
                  rejectUnauthorized: false,
               }),
            });
            let cars = items.data.items;
            const addCarsss = await loopOnCarsPerPage(cars);
         }
      } catch (err) {
         console.error(err);
      }
   } catch (err) {
      console.error(err);
   }
   console.info(`Ending At ${moment().format("YYYY/MM/DD-h:mm:ss a")}`);
});

function rewritePlateChar(charac) {
   if (alf.includes(charac)) {
      return "ا";
   } else if (yaa.includes(charac)) {
      return "ى";
   } else if (haa.includes(charac)) {
      return "ه";
   } else if (wow.includes(charac)) {
      return "و";
   } else {
      return charac;
   }
}

async function loopOnCarsPerPage(items) {
   try {
      let cars = items;
      cars = cars.map((car) => {
         let name = car.assr_name_ar;
         let PhoneNumber = car.cust_phone;
         let policyNumber = car.pol_number;
         let polStart = car.pol_from.split("/");
         polStart = new Date(
            polStart[2],
            polStart[1] == 0 ? 11 : polStart[1] - 1,
            polStart[0]
         );
         let polEnd = car.pol_to.split("/");
         polEnd = new Date(
            polEnd[2],
            polEnd[1] == 0 ? 11 : polEnd[1] - 1,
            polEnd[0]
         );
         let year = car.model_year;
         let plateNumber = car.car_numbers
            ? car.car_numbers.split(" ")
            : undefined;
         if (plateNumber) {
            if (plateNumber.length === 4) {
               plateNumber = `${rewritePlateChar(
                  plateNumber[0]
               )}-${rewritePlateChar(plateNumber[1])}-${rewritePlateChar(
                  plateNumber[2]
               )}-${rewritePlateChar(plateNumber[3])}`;
            } else if (plateNumber.length === 3) {
               plateNumber = `${rewritePlateChar(
                  plateNumber[0]
               )}-${rewritePlateChar(plateNumber[1])}--${rewritePlateChar(
                  plateNumber[2]
               )}`;
            } else {
               plateNumber = undefined;
            }
         }
         let vinNumber = car.chassis_no.toLowerCase();
         let manufacturer = car.car_brand.split(" ")[0];
         let changes = car.idx_no;
         return {
            name,
            PhoneNumber,
            policyNumber,
            polStart,
            polEnd,
            year,
            plateNumber,
            vinNumber,
            manufacturer,
            changes,
         };
      });
      console.info(cars);

      for (let i = 0; i < cars.length; i++) {
         console.info(cars[i]);
         if (cars[i].changes !== 0) {
            const updating = await updateCar(cars[i]);
         } else {
            const car = await addCar(cars[i]);
            console.info(car);
         }
      }
   } catch (err) {
      console.error(err);
   }
}
module.exports = getAndSaveCars;
