import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

test("translation catalogs cover UI strings and preserve interpolation in all languages", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: "custom", logLevel: "error" });
  try {
    const { messages } = await server.ssrLoadModule("/src/i18n/messages.ts");
    const { setLanguage, translate, savedLanguage, categoryLabel, weekdayLabels } = await server.ssrLoadModule("/src/i18n/index.ts");
    const { money, dateLabel, today } = await server.ssrLoadModule("/src/utils/finance.ts");
    const parameters = value => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
    for (const [source, translations] of Object.entries(messages)) {
      assert.equal(translations.length, 3, source);
      for (const translation of translations) {
        assert.ok(translation.trim(), source);
        assert.deepEqual(parameters(translation), parameters(source), source);
      }
    }
    function checkSource(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) { checkSource(file); continue; }
        if (!file.endsWith(".tsx")) continue;
        const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
        function checkArgument(node) {
          if (ts.isStringLiteral(node)) assert.ok(messages[node.text], `${file}: ${node.text}`);
          else if (ts.isConditionalExpression(node)) { checkArgument(node.whenTrue); checkArgument(node.whenFalse); }
        }
        function visit(node) {
          if (ts.isCallExpression(node) && node.expression.getText(source) === "translate" && node.arguments[0]) checkArgument(node.arguments[0]);
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
    checkSource("src/components"); checkSource("src/pages");
    assert.equal(savedLanguage(), "en");
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { lang: "en" } } });
    const isoDate = today();
    try {
      for (const [code, locale, currencyLocale, settings] of [["en", "en-GB", "en-IE", "Settings"], ["pt", "pt-PT", "pt-PT", "Definições"], ["fr", "fr-FR", "fr-FR", "Paramètres"], ["es", "es-ES", "es-ES", "Configuración"]]) {
        setLanguage(code, false);
        assert.equal(translate("Settings"), settings);
        assert.equal(money(1234.56), new Intl.NumberFormat(currencyLocale, { style: "currency", currency: "EUR" }).format(1234.56));
        assert.equal(dateLabel("2026-11-07"), new Date("2026-11-07T12:00:00").toLocaleDateString(locale, { day: "numeric", month: "short" }));
        assert.equal(weekdayLabels().length, 7);
        assert.equal(today(), isoDate);
        assert.equal(categoryLabel("Source"), "Source", "Custom categories must not be translated");
        assert.equal(translate("{{count}} expenses", { count: 12 }).includes("{{"), false);
      }
    } finally {
      setLanguage("en", false);
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else delete globalThis.document;
    }
  } finally { await server.close(); }
});
