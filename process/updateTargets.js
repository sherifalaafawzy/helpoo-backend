const cron = require('node-cron');
const { Op } = require('sequelize');

const ServiceRequest = require('../models/ServiceRequest');
const Targets = require('../models/Targets');

async function updateTarget() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  // const day = date.getDate()
  const formattedMonthStart = `${year}-${month}-${1}`;
  const monthName = date.toLocaleString('default', { month: 'long' });
  const getTimeStampForCurrent = new Date(formattedMonthStart).getTime();

  let thisMonthTarget = await Targets.findOne({
    where: {
      month: monthName,
      year,
    },
  });
  let serviceRequests = await ServiceRequest.findAll({
    where: {
      createdAt: {
        [Op.gte]: getTimeStampForCurrent,
      },
      status: 'done',
    },
  });
  serviceRequests = serviceRequests.map((request) =>
    request.get({ plain: true })
  );
  let serviceRequestCount = serviceRequests.length;
  let thisMonthRevenue = 0;
  for (let i = 0; i < serviceRequestCount; i++) {
    thisMonthRevenue += serviceRequests[i].fees;
  }
  if (!thisMonthTarget) {
    // pass
    return 'pass';
  } else {
    await Targets.update(
      {
        revenue: thisMonthRevenue,
        achievedPercentage: (thisMonthRevenue / thisMonthTarget.target) * 100,
        achieved: thisMonthTarget.target > thisMonthRevenue ? false : true,
      },
      {
        where: {
          id: thisMonthTarget.id,
        },
      }
    );
    return 'ok';
  }
}

const forThirtyOneMonth = cron.schedule(
  '59 23 31 January,March,May,July,August,October,December *',
  async () => {
    await updateTarget();
  }
);

const forThirtyMonth = cron.schedule(
  '59 23 30 April,June,September,November *',
  async () => {
    await updateTarget();
  }
);

const forFeb = cron.schedule('59 23 28 Feb *', async () => {
  await updateTarget();
});

// const updateNow = cron.schedule("* * * * *",async ()=>{
//     console.info("working...");
//     try{
//         await updateTarget()
//     } catch(err){
//         console.error(err);
//     }
// })

module.exports = {
  forThirtyMonth,
  forThirtyOneMonth,
  forFeb,
  // updateNow
};
