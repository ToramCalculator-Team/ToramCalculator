import { SolidAuth, type SolidAuthConfig } from "@auth/solid-start";
import Github from "@auth/solid-start/providers/github";
import Email from "@auth/solid-start/providers/nodemailer";
import Discord from "@auth/solid-start/providers/discord";
import QQ from "./qq";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USERNAME,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DBNAME,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const authOpts: SolidAuthConfig = {
  // callbacks: {
  //   session: ({ session, user }) => {
  //     return {
  //       ...session,
  //       user: {
  //         ...user,
  //       },
  //       expires: session.expires,
  //     };
  //   },
  // },
  adapter: PostgresAdapter(pool),
  providers: [
    QQ({
      issuer: "KiaClouth",
      clientId: process.env.QQ_CLIENT_ID,
      clientSecret: process.env.QQ_CLIENT_SECRET,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
    Github({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  debug: true,
  secret: process.env.AUTH_SECRET,
  // pages: {
  //   signIn: '/uth/signIn'
  // }
};

export const { GET, POST } = SolidAuth(authOpts);
