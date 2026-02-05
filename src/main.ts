import "./styles/main.css"

import { setupErrorHandlers } from "./core/ErrorHandler"

setupErrorHandlers()

const app = document.getElementById("app")
if (app) {
    app.innerHTML = `
        <h1>Hello World</h1>
        <p>Your web app starts here.</p>
    `
}
