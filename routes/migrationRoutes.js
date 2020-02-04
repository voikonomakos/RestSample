const express = require('express');
const adminRouter = express.Router();

module.exports = function () {
    const migrationController = require('../controllers/migrationController');

    adminRouter.post('/categories', migrationController.importCategories);
    adminRouter.post('/spots', migrationController.importSpots);
    adminRouter.post('/save', migrationController.saveSpot);

    adminRouter.put('/user/email', migrationController.updateUserEmail);

    return adminRouter;
};
