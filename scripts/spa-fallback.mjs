// GitHub Pages has no URL rewrites: serving index.html as 404.html lets deep links like /learn/phy load the app.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
