import { logger } from "./infrastructure/config/settings";
import { HappeoAdapter } from "./infrastructure/adapters/happeo/happeo-adapter";
import { SqlAdapter } from "./infrastructure/adapters/sql/sql-adapter";
import { SmtpAdapter } from "./infrastructure/adapters/smtp/smtp-adapter";
import { NotificationService } from "./application/services/notification-service";

async function main(): Promise<void> {
  logger.info("Iniciando proceso de notificaciones...");

  const happeo = new HappeoAdapter(
    process.env.HAPPEO_API_URL,
    process.env.HAPPEO_API_KEY,
    process.env.HAPPEO_CHANNEL_ID,
  );

  const sql = new SqlAdapter({
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  });

  const smtp = new SmtpAdapter(
    process.env.SMTP_SERVER,
    Number(process.env.SMTP_PORT ?? 25),
    process.env.SENDER_EMAIL,
    process.env.SMTP_PASS ?? "",
  );

  const service = new NotificationService(happeo, sql, smtp);

  try {
    const hours = Number(process.env.SEARCH_WINDOW_HOURS ?? 24);
    await service.run(hours);
    logger.info("Proceso finalizado correctamente.");
  } catch (error) {
    logger.error(`Error fatal en la ejecucion: ${String(error)}`);
    process.exitCode = 1;
  }
}

void main();
