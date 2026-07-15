import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const requiredFiles = [
    "index.html",
    "404.html",
    "CNAME",
    ".nojekyll",
    "robots.txt",
    "sitemap.xml",
    "brand-symbol.png",
    "brand-logo.png",
    "favicon.ico",
    "favicon-32.png",
    "apple-touch-icon.png",
    "osito-personalizado-premium.webp",
    "catalogo-gato-negro.webp",
    "catalogo-bulldog-frances.webp",
    "catalogo-salchicha.webp",
    "catalogo-schnauzer.webp",
    "catalogo-poodle.webp",
    "catalogo-shih-tzu.webp",
    "catalogo-perro-criollo.webp",
    "catalogo-gato-persa.webp",
    "catalogo-gato-criollo.webp",
    "catalogo-pinscher.webp",
    "hero.jpg"
];

const failures = [];
const fail = (message) => failures.push(message);

for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(root, file))) fail(`Falta ${file}`);
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const page404 = fs.readFileSync(path.join(root, "404.html"), "utf8");
const cname = fs.readFileSync(path.join(root, "CNAME"), "utf8").trim();

if (cname !== "peluditos3d.shop") fail("CNAME no contiene el dominio raíz exacto");
if ((index.match(/<h1\b/gi) || []).length !== 1) fail("index.html debe tener exactamente un h1");
if (!index.includes('<link rel="canonical" href="https://peluditos3d.shop/">')) fail("Falta canonical de producción");
if (!index.includes('property="og:url" content="https://peluditos3d.shop/"')) fail("Falta og:url de producción");
if (!index.includes('id="cart-display" aria-live="polite"')) fail("El carrito no tiene región aria-live");
if (!index.includes("localStorage")) fail("El carrito no implementa persistencia");
if (!index.includes("window.confirm")) fail("Falta confirmación antes de WhatsApp");
if (!index.includes('id="personalizados"')) fail("Falta la sección de personalizados premium");
if (!index.includes("quiero%20cotizar%20un%20personalizado%20premium")) fail("Falta el mensaje de cotización premium para WhatsApp");
if (!index.includes('id="personalizados" aria-labelledby="personalizados-title" hidden')) fail("La sección premium debe permanecer oculta");
if (!index.includes('<li hidden><a class="nav-link" href="#personalizados">')) fail("El acceso premium del menú debe permanecer oculto");
if (index.indexOf('id="como-funciona"') > index.indexOf('id="catalogo"')) fail("La guía de instalación debe aparecer antes del catálogo");
if ((index.match(/class="product-card(?:\s|"|>)/g) || []).length !== 10) fail("El catálogo debe contener 10 productos");
if (!index.includes('"Pinscher": 19900')) fail("El Pinscher no tiene el precio promocional esperado");
if (index.includes("UNIT_PRICE")) fail("El carrito aún usa un precio único para todos los modelos");
if (!index.includes('class="brand-logo" src="brand-logo.png"')) fail("El encabezado debe usar el logotipo oficial horizontal");
if (!index.includes('class="footer-brand"') || !index.includes('alt="Peluditos 3D"')) fail("El pie de página debe mostrar el logotipo oficial");

for (const [name, content] of [["index.html", index], ["404.html", page404]]) {
    if (/shopify|myshopify|23\.227\.38\.65/i.test(content)) fail(`${name} conserva una referencia de Shopify`);
    if (/\b(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\b/i.test(content)) fail(`${name} parece contener un secreto`);

    const unsafeBlank = /target="_blank"(?![^>]*rel="[^"]*noopener[^"]*noreferrer)/gi;
    if (unsafeBlank.test(content)) fail(`${name} tiene un target=_blank sin noopener noreferrer`);
}

const localReferences = [...index.matchAll(/(?:src|href)="([^"#?]+)"/g)]
    .map((match) => match[1])
    .filter((reference) => !/^(?:https?:|mailto:|tel:)/.test(reference));

for (const reference of new Set(localReferences)) {
    if (!fs.existsSync(path.join(root, reference))) fail(`Recurso local inexistente: ${reference}`);
}

const executableScripts = [...index.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)];
for (const script of executableScripts) {
    try {
        new Function(script[1]);
    } catch (error) {
        fail(`JavaScript inválido: ${error.message}`);
    }
}

const jsonLd = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
if (!jsonLd) {
    fail("Falta JSON-LD");
} else {
    try {
        JSON.parse(jsonLd[1]);
    } catch (error) {
        fail(`JSON-LD inválido: ${error.message}`);
    }
}

if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
} else {
    console.log("Validación estática superada");
}
