'use strict';

const cron = require('node-cron');
const newsPipeline = require('../services/newsPipeline');

function startScheduler() {
  // 08:00 HKT every day
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] 08:00 HKT — triggering news pipeline');
    try {
      const result = await newsPipeline.runNewsPipeline('scheduler');
      console.log(`[Scheduler] 08:00 run complete: ${result.articlesAdded} articles added`);
    } catch (err) {
      console.error('[Scheduler] 08:00 run failed:', err.message);
    }
  }, { timezone: 'Asia/Hong_Kong' });

  // 18:00 HKT every day
  cron.schedule('0 18 * * *', async () => {
    console.log('[Scheduler] 18:00 HKT — triggering news pipeline');
    try {
      const result = await newsPipeline.runNewsPipeline('scheduler');
      console.log(`[Scheduler] 18:00 run complete: ${result.articlesAdded} articles added`);
    } catch (err) {
      console.error('[Scheduler] 18:00 run failed:', err.message);
    }
  }, { timezone: 'Asia/Hong_Kong' });

  console.log('[Scheduler] Cron jobs registered: 08:00 and 18:00 HKT daily');
}

module.exports = { startScheduler };
