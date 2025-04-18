const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const File = {
    create: async (fileData) => {
        const query = `
      INSERT INTO project_files (
        file_id, project_id, filename, 
        originalname, path, size, mimetype
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            uuidv4(),
            fileData.project_id,
            fileData.filename,
            fileData.originalname,
            fileData.path,
            fileData.size,
            fileData.mimetype || 'application/octet-stream' // Дефолтный MIME-тип
        ];
        const result = await db.query(query, values);
        return result.rows[0];
    },

    getByProject: async (projectId) => {
        const query = `
      SELECT file_id, originalname as name, size, 
             filename, created_at as uploadedAt
      FROM project_files 
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;
        const result = await db.query(query, [projectId]);
        return result.rows;
    }
};

module.exports = File;