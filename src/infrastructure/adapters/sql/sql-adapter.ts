import sql from "mssql";
import { Colaborador } from "../../../domain/models/colaborador";
import { CollabRepository } from "../../../domain/ports/repositories";
import { logger } from "../../config/settings";

type SqlConfigInput = {
  server?: string;
  database?: string;
  user?: string;
  password?: string;
};

type SqlRow = {
  Email?: string;
  Nombre?: string;
  Convenio?: string;
};

export class SqlAdapter implements CollabRepository {
  private readonly config: sql.config;

  constructor(input: SqlConfigInput) {
    if (!input.server || !input.database || !input.user || input.password == null) {
      throw new Error("Faltan variables de entorno para SQL Server (SERVER/DB/USER/PASS).");
    }

    this.config = {
      server: input.server,
      database: input.database,
      user: input.user,
      password: input.password,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  async findByCct(cctCodes: string[]): Promise<Colaborador[]> {
    const cleaned = cctCodes.map((c) => c.trim()).filter((c) => c.length > 0);
    if (cleaned.length === 0) {
      return [];
    }

    const paramNames = cleaned.map((_, i) => `cct${i}`);
    const inClause = paramNames.map((name) => `@${name}`).join(", ");

    const query = `
      SELECT DISTINCT
        LTRIM(RTRIM(usr.UsrMai)) as Email,
        LTRIM(RTRIM(opc.OpCNom)) + ' ' + LTRIM(RTRIM(opc.OpCApe)) as Nombre,
        LTRIM(RTRIM(npi.NpiCctCod)) as Convenio
      FROM PENPI npi
      JOIN PEOPC opc ON opc.OpCCod = npi.NpiMntOpCC
      JOIN SGUSR usr ON usr.UsrCod = opc.OpCUsrCod
      WHERE usr.UsrMai <> ''
        AND usr.UsrEst = 'A'
        AND LTRIM(RTRIM(npi.NpiCctCod)) IN (${inClause})
    `;

    let pool: sql.ConnectionPool | undefined;
    try {
      pool = await sql.connect(this.config);
      const request = pool.request();
      paramNames.forEach((name, i) => {
        request.input(name, sql.VarChar(50), cleaned[i]);
      });

      const result = await request.query(query);
      return result.recordset.map((row: SqlRow) => ({
        email: String(row.Email ?? "").trim(),
        nombre: String(row.Nombre ?? "").trim(),
        convenio: String(row.Convenio ?? "").trim(),
      }));
    } catch (error) {
      logger.error(`ERROR CRITICO EN SQL: ${String(error)}`);
      return [];
    } finally {
      if (pool) {
        await pool.close();
      }
    }
  }
}
