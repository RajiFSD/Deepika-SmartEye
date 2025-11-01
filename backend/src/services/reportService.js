const { 
  PeopleCountLog, 
  AlertLog, 
  CurrentOccupancy, 
  Camera, 
  Branch,
  Tenant,
  sequelize 
} = require("@models");
const { Op } = require("sequelize");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

class ReportService {
  async generateReport(reportData) {
    try {
      const { report_type, parameters, format = 'pdf' } = reportData;
      
      let report;
      
      switch (report_type) {
        case 'occupancy':
          report = await this.generateOccupancyReportData(parameters);
          break;
        case 'alerts':
          report = await this.generateAlertReportData(parameters);
          break;
        case 'summary':
          report = await this.generateSummaryReportData(parameters);
          break;
        default:
          throw new Error("Unsupported report type");
      }

      // Generate file based on format
      if (format === 'pdf') {
        return await this.generatePDF(report, report_type);
      } else if (format === 'excel') {
        return await this.generateExcel(report, report_type);
      } else {
        return report; // Return raw data for JSON format
      }
    } catch (error) {
      console.error("Error generating report:", error);
      throw new Error("Failed to generate report");
    }
  }

  async getAllReports({ page = 1, limit = 10, report_type } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = report_type ? { report_type } : {};
      
      // In a real application, you might have a Report model to store generated reports
      // For now, we'll return a mock response
      return {
        count: 0,
        rows: []
      };
    } catch (error) {
      console.error("Error fetching reports:", error);
      throw new Error("Failed to retrieve reports");
    }
  }

  async getReportById(id) {
    try {
      // In a real application, fetch from Report model
      throw new Error("Report storage not implemented");
    } catch (error) {
      console.error("Error fetching report by ID:", error);
      throw new Error("Failed to retrieve report");
    }
  }

  async deleteReport(id) {
    try {
      // In a real application, delete from Report model
      return { message: "Report deleted successfully" };
    } catch (error) {
      console.error("Error deleting report:", error);
      throw new Error("Failed to delete report");
    }
  }

  async getAvailableReportTypes() {
    return [
      { value: 'occupancy', label: 'Occupancy Report', description: 'Detailed occupancy and traffic analysis' },
      { value: 'alerts', label: 'Alert Report', description: 'Alert triggers and resolutions' },
      { value: 'summary', label: 'Summary Report', description: 'Overall system performance summary' },
      { value: 'accuracy', label: 'Accuracy Report', description: 'Detection accuracy metrics' }
    ];
  }

  async generateOccupancyReport({ start_date, end_date, camera_id, branch_id, format = 'pdf' }) {
    try {
      const parameters = { start_date, end_date, camera_id, branch_id };
      const reportData = await this.generateOccupancyReportData(parameters);
      
      if (format === 'pdf') {
        return await this.generatePDF(reportData, 'occupancy');
      } else if (format === 'excel') {
        return await this.generateExcel(reportData, 'occupancy');
      } else {
        return reportData;
      }
    } catch (error) {
      console.error("Error generating occupancy report:", error);
      throw new Error("Failed to generate occupancy report");
    }
  }

  async generateAlertReport({ start_date, end_date, camera_id, branch_id, status, format = 'pdf' }) {
    try {
      const parameters = { start_date, end_date, camera_id, branch_id, status };
      const reportData = await this.generateAlertReportData(parameters);
      
      if (format === 'pdf') {
        return await this.generatePDF(reportData, 'alerts');
      } else if (format === 'excel') {
        return await this.generateExcel(reportData, 'alerts');
      } else {
        return reportData;
      }
    } catch (error) {
      console.error("Error generating alert report:", error);
      throw new Error("Failed to generate alert report");
    }
  }

  // Data generation methods
  async generateOccupancyReportData(parameters) {
    const { start_date, end_date, camera_id, branch_id } = parameters;
    
    const where = {};
    if (start_date && end_date) {
      where.detection_time = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    if (camera_id) where.camera_id = camera_id;
    if (branch_id) where.branch_id = branch_id;

    const occupancyData = await PeopleCountLog.findAll({
      where,
      include: [
        { model: Camera, as: 'camera' },
        { model: Branch, as: 'branch' }
      ],
      order: [['detection_time', 'ASC']]
    });

    const summary = await PeopleCountLog.findAll({
      where,
      attributes: [
        'direction',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      group: ['direction'],
      raw: true
    });

    const hourlyBreakdown = await PeopleCountLog.findAll({
      where,
      attributes: [
        [sequelize.fn('HOUR', sequelize.col('detection_time')), 'hour'],
        'direction',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      group: ['hour', 'direction'],
      order: [['hour', 'ASC']],
      raw: true
    });

    return {
      metadata: {
        report_type: 'occupancy',
        generated_at: new Date(),
        parameters,
        total_records: occupancyData.length
      },
      summary: this.processSummary(summary),
      hourly_breakdown: this.processHourlyBreakdown(hourlyBreakdown),
      detailed_data: occupancyData
    };
  }

  async generateAlertReportData(parameters) {
    const { start_date, end_date, camera_id, branch_id, status } = parameters;
    
    const where = {};
    if (start_date && end_date) {
      where.alert_time = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    if (camera_id) where.camera_id = camera_id;
    if (branch_id) where.branch_id = branch_id;
    if (status) where.status = status;

    const alertData = await AlertLog.findAll({
      where,
      include: [
        { model: Camera, as: 'camera' },
        { model: Branch, as: 'branch' },
        { model: Tenant, as: 'tenant' }
      ],
      order: [['alert_time', 'DESC']]
    });

    const summary = await AlertLog.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('alert_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    return {
      metadata: {
        report_type: 'alerts',
        generated_at: new Date(),
        parameters,
        total_records: alertData.length
      },
      summary: summary,
      alerts: alertData
    };
  }

  async generateSummaryReportData(parameters) {
    const { tenant_id, start_date, end_date } = parameters;
    
    const where = { tenant_id };
    if (start_date && end_date) {
      where.detection_time = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const occupancyStats = await PeopleCountLog.findAll({
      where,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'total_detections'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN direction = 'IN' THEN 1 ELSE 0 END")), 'total_entries'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN direction = 'OUT' THEN 1 ELSE 0 END")), 'total_exits']
      ],
      raw: true
    });

    const alertStats = await AlertLog.findAll({
      where: { tenant_id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('alert_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const cameraStats = await Camera.findAll({
      where: { tenant_id, is_active: true },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('camera_id')), 'total_cameras']
      ],
      raw: true
    });

    return {
      metadata: {
        report_type: 'summary',
        generated_at: new Date(),
        parameters
      },
      occupancy_stats: occupancyStats[0],
      alert_stats: alertStats,
      camera_stats: cameraStats[0]
    };
  }

  // File generation methods
  async generatePDF(reportData, reportType) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve({
            filename: `${reportType}_report_${Date.now()}.pdf`,
            content: result,
            mimeType: 'application/pdf'
          });
        });

        // Add content to PDF based on report type
        this.addPDFContent(doc, reportData, reportType);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateExcel(reportData, reportType) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');

      // Add data to worksheet based on report type
      this.addExcelContent(worksheet, reportData, reportType);

      const buffer = await workbook.xlsx.writeBuffer();
      return {
        filename: `${reportType}_report_${Date.now()}.xlsx`,
        content: buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      throw new Error("Failed to generate Excel file");
    }
  }

  // Helper methods
  processSummary(summaryData) {
    const result = { entries: 0, exits: 0 };
    
    summaryData.forEach(item => {
      if (item.direction === 'IN') {
        result.entries = parseInt(item.count);
      } else if (item.direction === 'OUT') {
        result.exits = parseInt(item.count);
      }
    });

    return result;
  }

  processHourlyBreakdown(hourlyData) {
    const result = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      entries: 0,
      exits: 0
    }));

    hourlyData.forEach(item => {
      const hour = parseInt(item.hour);
      if (item.direction === 'IN') {
        result[hour].entries = parseInt(item.count);
      } else {
        result[hour].exits = parseInt(item.count);
      }
    });

    return result;
  }

  addPDFContent(doc, reportData, reportType) {
    doc.fontSize(20).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
    doc.moveDown();
    
    // Add specific content based on report type
    if (reportType === 'occupancy') {
      this.addOccupancyPDFContent(doc, reportData);
    } else if (reportType === 'alerts') {
      this.addAlertsPDFContent(doc, reportData);
    }
  }

  addExcelContent(worksheet, reportData, reportType) {
    // Add headers and data to Excel worksheet
    if (reportType === 'occupancy') {
      worksheet.addRow(['Hour', 'Entries', 'Exits']);
      reportData.hourly_breakdown.forEach(hour => {
        worksheet.addRow([hour.hour, hour.entries, hour.exits]);
      });
    } else if (reportType === 'alerts') {
      worksheet.addRow(['Alert Time', 'Camera', 'Status', 'Current Occupancy', 'Max Occupancy']);
      reportData.alerts.forEach(alert => {
        worksheet.addRow([
          alert.alert_time,
          alert.camera?.camera_name,
          alert.status,
          alert.current_occupancy,
          alert.max_occupancy
        ]);
      });
    }
  }

  addOccupancyPDFContent(doc, reportData) {
    doc.text(`Total Entries: ${reportData.summary.entries}`);
    doc.text(`Total Exits: ${reportData.summary.exits}`);
    doc.moveDown();
    doc.text('Hourly Breakdown:');
    reportData.hourly_breakdown.forEach(hour => {
      doc.text(`Hour ${hour.hour}: ${hour.entries} entries, ${hour.exits} exits`);
    });
  }

  addAlertsPDFContent(doc, reportData) {
    doc.text(`Total Alerts: ${reportData.metadata.total_records}`);
    doc.moveDown();
    doc.text('Alert Summary:');
    reportData.summary.forEach(stat => {
      doc.text(`${stat.status}: ${stat.count}`);
    });
  }
}

module.exports = new ReportService();