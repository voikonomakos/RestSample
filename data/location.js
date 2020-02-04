'use strict';
var _ = require('lodash');

class Location {
  constructor(name, longitude, latitude, formattedAddress, gmsAddress, googlePlaceId, about, types) {
    this.name = name;
    this.geo = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
    this.formattedAddress = formattedAddress;
    this.gmsAddress = gmsAddress;
    this.googlePlaceId = googlePlaceId;
    this.about = about;
    this.types = types;
    this.text = this.getText();
  }

  getCity() {
    if (this.gmsAddress) {
      return this.gmsAddress.locality;
    } else {
      return 'Other'
    }
  }

  getCountry() {
    if (this.gmsAddress) {
      return this.gmsAddress.country;
    } else {
      return 'Other'
    }
  }

  getText() {
    var values = new Set();

    if (this.gmsAddress.locality) {
      values.add(this.gmsAddress.locality);
    }

    if (this.gmsAddress.administrative_area_level_1) {
      values.add(this.gmsAddress.administrative_area_level_1);
    }

    if (this.gmsAddress.country) {
      values.add(this.gmsAddress.country);
    }

    let text = '';
    for (let value of values) {
      text = text + value + ',';
    }

    return _.trim(text, ',');
  }
}

module.exports = Location;
