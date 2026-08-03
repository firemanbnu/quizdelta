const { Op } = require('sequelize');

const ADMIN_ONLY_CATEGORIES = ['Guarda'];

function isAdminOnlyCategory(category) {
  return ADMIN_ONLY_CATEGORIES.includes(category);
}

function applyCategoryRestriction(where, user) {
  if (!user || user.role === 'admin') return where;

  const { category } = where;
  if (category !== undefined) {
    if (category && category[Op.in]) {
      const list = category[Op.in].filter((c) => !isAdminOnlyCategory(c));
      where.category = { [Op.in]: list };
    } else if (isAdminOnlyCategory(category)) {
      where.category = { [Op.in]: [] };
    }
  } else {
    where.category = { [Op.notIn]: ADMIN_ONLY_CATEGORIES };
  }
  return where;
}

module.exports = { ADMIN_ONLY_CATEGORIES, isAdminOnlyCategory, applyCategoryRestriction };
