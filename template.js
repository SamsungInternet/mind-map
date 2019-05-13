module.exports = function (str) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/style.css">

    <title>Gooey Mind Maps</title>
    <meta property="og:title" content="Gooey Mind Maps">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@lady_ada_king">
    <meta name="twitter:creator" content="@lady_ada_king">
    <meta property="og:url" content="https://mind-map.glitch.me/">
    <meta property="og:description" content="Verlet Integration + SVG filters">
    <meta property="og:image" content="https://cdn.glitch.com/f9622cff-4a4c-4f55-8b0a-5c6db5e81a2b%2Fimage.png?1556809027662">
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/markdown-it/8.4.2/markdown-it.min.js"></script>
    <script>window.saveData=${str}</script>
    <script type="module" src="/script.js" defer></script>
  </head>  
  <body>
  </body>
</html>`
}