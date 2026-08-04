const { Op } = require('sequelize');

const ADMIN_ONLY_CATEGORIES = ['Guarda'];

function isAdminOnlyCategory(category) {
  return ADMIN_ONLY_CATEGORIES.includes(category);
}

function applyCategoryRestriction(where, user) {
  if (!user || user.role === 'admin') return where;

  const allowed = Array.isArray(user.allowedCategories) ? user.allowedCategories.filter(Boolean) : [];
  const available = allowed.filter((c) => !isAdminOnlyCategory(c));

  if (available.length === 0) {
    where.category = { [Op.in]: [] };
    return where;
  }

  const { category } = where;
  if (category !== undefined) {
    if (category && category[Op.in]) {
      where.category = { [Op.in]: category[Op.in].filter((c) => available.includes(c)) };
    } else if (typeof category === 'string') {
      where.category = available.includes(category) ? { [Op.in]: [category] } : { [Op.in]: [] };
    }
  } else {
    where.category = { [Op.in]: available };
  }
  return where;
}

module.exports = { ADMIN_ONLY_CATEGORIES, isAdminOnlyCategory, applyCategoryRestriction };
