'use strict';
const express = require('express');
const spotsRouter = express.Router();

module.exports = function () {
  const spotsController = require('../controllers/spotsController');

  spotsRouter.get("/:id?", spotsController.search);
  spotsRouter.get("/feed", spotsController.getFeeds);
  spotsRouter.get("/me/feed/:ts?", spotsController.getMyPeopleSpots);
  spotsRouter.get("/me/curatedFeed/:ts?", spotsController.getSpotsForMe);
  spotsRouter.get("/me/all/:ts?", spotsController.getAllSpots);
  spotsRouter.get("/me/getByUserId", spotsController.getSpotByUserId);
  spotsRouter.get("/:spotId/verifiers", spotsController.getVerifiedBy);
  spotsRouter.get("/:spotId/savers", spotsController.getSavedBy);
  spotsRouter.get("/:spotId/comments/", spotsController.getComments);
  spotsRouter.get("/uploaded/:boardId/:listView?", spotsController.getMyUploadedSpots);
  spotsRouter.get("/saved/:boardId/:listView?", spotsController.getMySavedSpots);

  spotsRouter.post('/', spotsController.upload);
  spotsRouter.post('/save', spotsController.save);
  spotsRouter.post('/unsave', spotsController.unsave);
  spotsRouter.post('/comment', spotsController.comment);
  spotsRouter.post('/verify', spotsController.verify);
  spotsRouter.post('/unverify', spotsController.unverify);

  spotsRouter.put('/subCategory', spotsController.updateSpotSubCategory);
  spotsRouter.put('/', spotsController.update);
  spotsRouter.put('/:boardId/thumbnail', spotsController.updateBoardThumbnail);


  spotsRouter.delete('/media', spotsController.deleteSpotMedia);
  spotsRouter.delete('/', spotsController.deleteSpot);

  return spotsRouter;
};
