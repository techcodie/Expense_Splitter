const express = require('express');
const router = express.Router();
const { createGroup, joinGroup, getUserGroups } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth');

// All group routes are protected
router.use(protect);

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/', getUserGroups);

module.exports = router;