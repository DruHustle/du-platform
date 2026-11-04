import { describe, expect, it } from "vitest";
import { databaseConnectionOptions } from "../../../shared/databaseConfig";

const aiven = { NODE_ENV: "production", AIVEN_MYSQL_URL: "mysql://user:secret@database.example:3306/app", AIVEN_CA_CERT: "test-ca" };

describe("production database selection", () => {
  it("retains Aiven by default even when a local DATABASE_URL is present", () => {
    const options = databaseConnectionOptions({ ...aiven, DATABASE_URL: "mysql://local:secret@localhost/local" });
    expect(options?.uri).toContain("database.example");
    expect(options?.ssl).toEqual({ rejectUnauthorized: true, verifyIdentity: true, ca: "test-ca" });
  });

  it("requires an explicit provider and verified CA for a self-hosted MySQL target", () => {
    const env = { NODE_ENV: "production", DATABASE_PROVIDER: "mysql", DATABASE_URL: "mysql://user:secret@du-mysql:3306/app" };
    expect(() => databaseConnectionOptions(env)).toThrow(/MYSQL_CA_CERT/);
    expect(databaseConnectionOptions({ ...env, MYSQL_CA_CERT: "private-ca" })?.ssl).toEqual({ rejectUnauthorized: true, verifyIdentity: true, ca: "private-ca" });
  });

  it("does not let URL parameters disable TLS verification", () => {
    const options = databaseConnectionOptions({ ...aiven, AIVEN_MYSQL_URL: `${aiven.AIVEN_MYSQL_URL}?ssl=false&ssl-mode=DISABLED` });
    expect(options?.uri).not.toContain("ssl");
    expect(options?.ssl).toEqual({ rejectUnauthorized: true, verifyIdentity: true, ca: "test-ca" });
  });

  it("fails closed for unsupported providers, protocols, invalid ports and unreadable CA files", () => {
    expect(() => databaseConnectionOptions({ ...aiven, DATABASE_PROVIDER: "postgres" })).toThrow(/DATABASE_PROVIDER/);
    expect(() => databaseConnectionOptions({ ...aiven, AIVEN_MYSQL_URL: "https://user:secret@db.example/app" })).toThrow(/MySQL URL/);
    expect(() => databaseConnectionOptions({ NODE_ENV: "production", AIVEN_MYSQL_HOST: "db.example", AIVEN_MYSQL_USER: "app", AIVEN_MYSQL_DATABASE: "app", AIVEN_MYSQL_PORT: "-1" })).toThrow(/port/);
    expect(() => databaseConnectionOptions({ ...aiven, AIVEN_CA_CERT: "", AIVEN_CA_CERT_PATH: "/not-present/ca.pem" })).toThrow(/cannot be read/);
  });

  it("retains disposable local development connections without production TLS requirements", () => {
    const options = databaseConnectionOptions({ NODE_ENV: "test", DATABASE_URL: "mysql://user:secret@localhost/app_test" });
    expect(options?.ssl).toBeUndefined();
    expect(databaseConnectionOptions({ NODE_ENV: "production", DATABASE_URL: "mysql://user:secret@localhost/app_test" })).toBeNull();
  });
});
