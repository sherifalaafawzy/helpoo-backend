const { I18n } = require('i18n');
const path = require('path');

const i18n = new I18n({
  locales: ['en', 'ar'],
  directory: path.join(__dirname, '../locales'),
});

module.exports = i18n;
