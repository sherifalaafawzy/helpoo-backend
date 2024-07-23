const PDFReport = require('../models/PDFReport');

class PDFTypeService {
  async getPDFType(id) {
    const pdfType = await PDFReport.findOne({
      where: {
        id,
      },
    });
    if (!pdfType) return new AppError("Couldn't find this pdfType", 404);
    return pdfType;
  }

  async updatePDFType(id, data) {
    let PDFType = await this.getPDFType(id);
    if (!PDFType) {
      PDFType = await PDFReport.create(data);
      return PDFType;
    }
    return await PDFReport.update(data, {
      where: {
        id,
      },
    });
  }
  async createPDFType(data) {
    return await PDFReport.create(data);
  }

  async getPDFTypes() {
    return await PDFReport.findAll();
  }
  async deletePDFType(id) {
    return await PDFReport.destroy({
      where: {
        id,
      },
    });
  }
}

const pdfTypeService = new PDFTypeService();
module.exports = pdfTypeService;
