import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { EmailSender } from "../../../domain/ports/repositories";
import { logger } from "../../config/settings";

type TemplateContext = Record<string, unknown>;

function renderTemplate(template: string, context: TemplateContext): string {
  let output = template;

  output = output.replace(
    /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g,
    (_full, itemVar: string, listVar: string, loopBody: string) => {
      const list = context[listVar];
      if (!Array.isArray(list)) {
        return "";
      }

      return list
        .map((item) => {
          if (item == null || typeof item !== "object") {
            return "";
          }

          return loopBody.replace(new RegExp(`\\{\\{\\s*${itemVar}\\.(\\w+)\\s*\\}\\}`, "g"), (_m, key) => {
            const value = (item as Record<string, unknown>)[key];
            return value == null ? "" : String(value);
          });
        })
        .join("");
    },
  );

  output = output.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => {
    const value = context[key];
    return value == null ? "" : String(value);
  });

  return output;
}

export class SmtpAdapter implements EmailSender {
  private readonly server: string;
  private readonly port: number;
  private readonly user: string;
  private readonly password: string;
  private readonly templatePath: string;

  constructor(server?: string, port?: number, user?: string, password?: string) {
    if (!server || !port || !user) {
      throw new Error("Faltan variables de entorno para SMTP (SERVER/PORT/SENDER_EMAIL).");
    }

    this.server = server;
    this.port = port;
    this.user = user;
    this.password = password ?? "";
    this.templatePath = path.resolve(process.cwd(), "src", "infrastructure", "adapters", "smtp", "template_email.html");
  }

  async sendNotification(toEmail: string, subject: string, context: Record<string, unknown>): Promise<void> {
    let template: string;

    try {
      template = await fs.readFile(this.templatePath, "utf-8");
    } catch {
      logger.error(`No se encuentra el template en ${this.templatePath}`);
      return;
    }

    const body = renderTemplate(template, context);
    const transporter = nodemailer.createTransport({
      host: this.server,
      port: this.port,
      secure: false,
      auth: {
        user: this.user,
        pass: this.password,
      },
    });

    try {
      await transporter.sendMail({
        from: this.user,
        to: toEmail,
        subject,
        html: body,
      });

      logger.info(`Enviado a: ${toEmail}`);
    } catch (error) {
      logger.error(`Error SMTP enviando a ${toEmail}: ${String(error)}`);
    }
  }
}

