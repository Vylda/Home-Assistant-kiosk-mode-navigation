customElements.whenDefined("ha-more-info-dialog").then(() => {
  const MoreInfoDialog = customElements.get("ha-more-info-dialog");
  const originalShouldShowAddEntityTo = MoreInfoDialog.prototype._shouldShowAddEntityTo;

  MoreInfoDialog.prototype._shouldShowAddEntityTo = function () {
    const hasAndroidAppActions =
      this.hass?.auth?.external?.config?.hasEntityAddTo === true;

    if (hasAndroidAppActions) {
      return false;
    }

    return originalShouldShowAddEntityTo.call(this);
  };
});
