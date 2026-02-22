'use strict';

const userModel = require('../models/userModel');
const preferenceModel = require('../models/preferenceModel');

async function showProfile(req, res) {
  const prefs = await preferenceModel.findByUserId(req.user.id);
  res.render('pages/profile', {
    pageTitle: 'Profile Settings',
    prefs
  });
}

async function updateProfile(req, res) {
  const { display_name, languages, categories, email_digest } = req.body;

  try {
    await userModel.updateDisplayName(req.user.id, display_name);
    const langArray = Array.isArray(languages) ? languages : (languages ? [languages] : ['en']);
    await preferenceModel.upsert(req.user.id, {
      languages: langArray.length > 0 ? langArray : ['en'],
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : []),
      emailDigest: email_digest === true || email_digest === 'true' || email_digest === 'on'
    });

    req.flash('success', 'Profile updated successfully.');
  } catch (err) {
    console.error('[Profile] Update error:', err);
    req.flash('error', 'Failed to update profile. Please try again.');
  }

  res.redirect('/profile');
}

module.exports = { showProfile, updateProfile };
