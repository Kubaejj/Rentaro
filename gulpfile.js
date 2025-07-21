const { src, dest, watch, series } = require("gulp");
const nunjucksRender = require("gulp-nunjucks-render");
const data = require("gulp-data");
const plumber = require("gulp-plumber");
const fs = require("fs");
const path = require("path");
const colors = require("ansi-colors");
const fancyLog = require("fancy-log");
const htmlLint = require("gulp-htmllint");
const prettyError = require("gulp-prettyerror");

// --- CSS ---
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const cssnano = require("cssnano");

// --- JS ---
const terser = require("gulp-terser");

// --- next-gen formats ---
// const webp = require('gulp-webp');
const avif = require('gulp-avif');

// Cesty
const paths = {
  dataFile: "src/data.json",
  src: "src",
  dest: "./",
  styles: "src/styles/**/*.scss",
  stylesDest: "./styles",
  scripts: "src/scripts/*.js",
  scriptsDest: "./scripts",
  images: 'src/img/',
  imagesDest: './img'
};

// --- Šablony (Nunjucks) ---

function renderIndex() {
  return src("src/index.html")
    .pipe(plumber())
    .pipe(data(() => JSON.parse(fs.readFileSync(paths.dataFile))))
    .pipe(
      nunjucksRender({
        path: ["src/"]
      })
    )
    .pipe(dest(paths.dest)); // do rootu
}

function renderPages() {
  return src("src/pages/**/*.html")
    .pipe(plumber())
    .pipe(data(() => JSON.parse(fs.readFileSync(paths.dataFile))))
    .pipe(
      nunjucksRender({
        path: ["src/"]
      })
    )
    .pipe(dest(path.join(paths.dest, "pages"))); // do /pages
}

// --- SCSS → CSS + autoprefix + minify ---
function styles() {
  return src(paths.styles)
    .pipe(plumber())
    .pipe(sass().on("error", sass.logError))
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(dest(paths.stylesDest));
}

// --- Minifikace JS ---
function scripts() {
  return src(paths.scripts)
    .pipe(plumber())
    .pipe(terser())
    .pipe(dest(paths.scriptsDest));
}

// --- Konverze obrázků na AVIF ---
function imagesToAvif() {
  return src(paths.images + '**/*.{jpg,jpeg,png}')
    .pipe(plumber())
    .pipe(avif({ quality: 50 }))
    .pipe(dest(paths.imagesDest));
}

// --- Kopírování ostatních assetů ---
function copyStaticAssets() {
  return src([
    paths.src + '/**/*',
    '!' + paths.src + '/**/*.html',
    '!' + paths.src + '/styles/**/*',
    '!' + paths.src + '/scripts/**/*',
    '!' + paths.src + '/img/**/*.{jpg,jpeg,png}',
    '!' + paths.src + '/data.json'
  ], { encoding: false })
    .pipe(plumber())
    .pipe(dest(paths.dest));
}

// --- Watcher ---
function watchFiles() {
  watch("src/index.html", renderIndex);
  watch("src/pages/**/*.html", renderPages);
  watch(paths.dataFile, series(renderIndex, renderPages));
  watch(paths.styles, styles);
  watch(paths.scripts, scripts);
  watch(paths.images, series(imagesToAvif));
  watch(paths.src + '/**/*', copyStaticAssets);
}

// --- HTML lint ---
function htmlLintTask() {
  let errorFree = true;

  return src(["src/**/*.html"])
    .pipe(
      htmlLint({}, function (filepath, issues) {
        if (issues.length > 0) {
          errorFree = false;
          fancyLog(colors.cyan("[gulp-htmllint]") + " Error in " + colors.magenta(filepath));
        }

        issues.forEach(function (issue) {
          process.stdout.write(colors.white("line " + issue.line + ", col " + issue.column) + "\t\t" + colors.red(issue.msg) + " " + colors.white("[" + issue.rule + ":" + issue.code + "]") + "\n");
        });

        if (issues.length > 0) {
          process.exitCode = 1;
        }
      })
    )
    .on("finish", function () {
      if (errorFree) {
        fancyLog(colors.green("Task completed successfully!") + " [_htmlLint]");
      } else {
        fancyLog(colors.red("Task failed!"));
      }
    });
}

// --- Default ---
exports.default = series(
  renderIndex,
  renderPages,
  styles,
  scripts,
  htmlLintTask,
  imagesToAvif,
  copyStaticAssets,
  watchFiles
);
