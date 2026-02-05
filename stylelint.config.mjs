/** @type {import('stylelint').Config} */
export default {
    extends: ["stylelint-config-standard"],
    rules: {
        "color-hex-length": "long",
        "declaration-empty-line-before": null,
        "no-empty-source": null,
        "no-descending-specificity": null,
        "property-no-vendor-prefix": null,
    },
}
