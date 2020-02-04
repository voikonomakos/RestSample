'use strict';

class UserBasicInfo {
  constructor(userId, username, name, profileImage, coverImage) {
    this.id = userId;
    this.username = username;
    this.name = name;
    this.profileImage = profileImage;
    this.coverImage = coverImage;
  }
}

class User {
  constructor(firebaseId, username, name, email, profileImage, coverImage, bio, profile) {
    this.firebaseId = firebaseId;
    this.username = username;
    this.name = name;
    this.email = email;
    this.profileImage = profileImage || {};
    this.coverImage = coverImage || {};
    this.bio = bio || '';
    this.profile = profile || {};
    this.savedSpotsCount = 0;
    this.uploadedSpotsCount = 0;
    this.followers = [];
    this.myPeople = [];
    this.followRequests = [];
    this.followersCount = 0;
    this.myPeopleCount = 0;
    this.followRequestsCount = 0;
    this.savedBoards = [];
    this.uploadedBoards = [];
    this.savedBoardsCount = 0;
    this.uploadedBoardsCount = 0;
    this.citiesCount = 0;
    this.countriesCount = 0;
  }
}

class UserProfile {
  constructor(hometown, currentLocation, nextStop, interests, isPublic) {
    this.hometown = hometown;
    this.currentLocation = currentLocation;
    this.nextStop = nextStop;
    this.interests = interests;
    this.isPublic = isPublic || true;
  }
}

class UserImage {
  constructor(id, placeholderColor, url) {
    this.id = id;
    this.placeholderColor = placeholderColor;
    this.url = url || '';
  }
}

class UserLocation {
  constructor(city, country, long, lat, state) {
    this.city = city || 'London';
    this.country = country || 'UK';
    this.state = state;
    this.geo = {
      type: 'Point',
      coordinates: [long || -73.856077, lat || 40.848447]
    };
  }
}

class Follower {
  constructor(id, username, name, profileImage, coverImage) {
    this.id = id;
    this.username = username;
    this.name = name;
    this.profileImage = profileImage;
    this.coverImage = coverImage;
  }
}

class ToFollow extends Follower {
  constructor(id, username, name, profileImage, coverImage) {
    super(id, username, name, profileImage, coverImage);
  }
}

module.exports = { User, UserImage, UserLocation, Follower, ToFollow, UserBasicInfo };
