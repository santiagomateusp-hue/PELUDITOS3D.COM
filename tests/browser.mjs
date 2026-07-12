import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.PELUDITOS_URL || "http://127.0.0.1:8031";
const outputDir = path.resolve(import.meta.dirname, "..", "..", "..", "outputs", "peluditos3d-qa");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const failures = [];
const browserMessages = [];

page.on("console", (message) => {
    if (["error", "warning", "warn"].includes(message.type())) browserMessages.push(`${message.type()}: ${message.text()}`);
});
page.on("pageerror", (error) => browserMessages.push(`pageerror: ${error.message}`));
page.on("requestfailed", (request) => browserMessages.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ""}`));

const check = (condition, message) => {
    if (!condition) failures.push(message);
};

await page.setViewportSize({ width: 1366, height: 768 });
await page.goto(baseUrl, { waitUntil: "networkidle" });

check(await page.title() === "Peluditos 3D | Accesorios para celular con causa", "Título incorrecto");
check(await page.locator("h1").count() === 1, "Debe existir un solo h1");
check(await page.locator('link[rel="canonical"]').getAttribute("href") === "https://peluditos3d.shop/", "Canonical incorrecto");

await page.locator("#product-select").selectOption("Poodle");
await page.locator("#product-qty").fill("2");
await page.locator("#add-product").click();
await page.getByRole("button", { name: "Agregar una unidad de Poodle" }).click();
check((await page.locator("#cart-display").innerText()).includes("3"), "No se actualizó la cantidad del carrito");
check((await page.locator("#cart-total").innerText()).includes("74.700"), "Total de carrito incorrecto");

await page.reload({ waitUntil: "networkidle" });
check((await page.locator("#cart-total").innerText()).includes("74.700"), "El carrito no persistió tras recargar");

await page.locator('#order-form button[type="submit"]').click();
check(await page.locator("#name").evaluate((element) => element === document.activeElement), "La validación no enfocó el nombre obligatorio");

await page.locator("#name").fill("Prueba QA");
await page.locator("#city").fill("Bogotá");
await page.locator("#address").fill("Dirección de prueba");
await page.locator("#notes").fill("Observación de prueba");

let confirmationText = "";
page.once("dialog", async (dialog) => {
    confirmationText = dialog.message();
    await dialog.dismiss();
});
await page.locator('#order-form button[type="submit"]').click();
check(confirmationText.includes("Revisa tu pedido"), "No apareció la confirmación previa a WhatsApp");
check((await page.locator("#form-status").innerText()).includes("seguir ajustando"), "No se informó la cancelación de la confirmación");

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(outputDir, "desktop-1366x768.png"), fullPage: false });
await page.locator(".story").screenshot({ path: path.join(outputDir, "story-sin-imagen.png") });
await page.locator("#mision").screenshot({ path: path.join(outputDir, "mision-sin-imagen.png") });
await page.locator("#personalizados").screenshot({ path: path.join(outputDir, "personalizados-premium.png") });
check(await page.locator(".story img").count() === 0, "La sección de regalo aún contiene una imagen");
check(await page.locator("#mision img").count() === 0, "La sección de misión aún contiene una imagen");
check(await page.locator('#personalizados img[src="osito-personalizado-premium.webp"]').count() === 1, "El banner premium de Osito no está presente");
const premiumLinks = page.locator('#personalizados a[href*="wa.me/573052556248"]');
check(await premiumLinks.count() === 2, "La sección premium debe ofrecer cotización por WhatsApp en escritorio y móvil");
check((await premiumLinks.first().getAttribute("href")).includes("personalizado%20premium"), "El enlace premium no lleva un mensaje de cotización preparado");

const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 }
];
const responsiveResults = [];

for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        h1Visible: Boolean(document.querySelector("h1")?.getBoundingClientRect().height),
        submitWidth: document.querySelector('.submit-order')?.getBoundingClientRect().width || 0
    }));
    responsiveResults.push({ ...viewport, ...metrics });
    check(metrics.documentWidth <= metrics.viewportWidth, `Desbordamiento horizontal en ${viewport.width}x${viewport.height}`);
    check(metrics.h1Visible, `H1 no visible en ${viewport.width}x${viewport.height}`);
    check(metrics.submitWidth > 0, `Botón de pedido no visible en ${viewport.width}x${viewport.height}`);
}

await page.setViewportSize({ width: 320, height: 568 });
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Abrir menú" }).click();
check(await page.getByRole("button", { name: "Cerrar menú" }).getAttribute("aria-expanded") === "true", "El menú móvil no abrió");

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100);
await page.screenshot({ path: path.join(outputDir, "mobile-390x844.png"), fullPage: false });
await page.getByRole("button", { name: "Abrir menú" }).click();
await page.getByRole("link", { name: "Personalizados", exact: true }).click();
await page.waitForTimeout(1800);
const premiumAnchorLayout = await page.evaluate(() => ({
    headerBottom: document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0,
    headingTop: document.querySelector("#personalizados-title")?.getBoundingClientRect().top || 0
}));
check(premiumAnchorLayout.headingTop >= premiumAnchorLayout.headerBottom, "El título premium queda oculto bajo la navegación móvil");
check(premiumAnchorLayout.headingTop < 260, "La navegación móvil no llegó a la sección premium");
await page.screenshot({ path: path.join(outputDir, "personalizados-mobile.png"), fullPage: false });

await page.goto(`${baseUrl}/404.html`, { waitUntil: "networkidle" });
check((await page.locator("h1").innerText()).includes("página no está aquí"), "La página 404 personalizada no cargó");

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.locator("footer").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const brokenImages = await page.locator("img").evaluateAll((images) => images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")));
check(brokenImages.length === 0, `Imágenes rotas: ${brokenImages.join(", ")}`);

await browser.close();

const report = {
    baseUrl,
    responsiveResults,
    brokenImages,
    browserMessages,
    failures,
    passed: failures.length === 0 && browserMessages.length === 0
};

fs.writeFileSync(path.join(outputDir, "qa-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
