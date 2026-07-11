// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package data

import "gorm.io/gorm"

func (s *Store) ListRecurringExpenses(includeDeleted bool) ([]RecurringExpense, error) {
	return listQuery[RecurringExpense](s, includeDeleted, func(db *gorm.DB) *gorm.DB {
		return db.Order(ColName + " asc, " + ColID + " desc")
	})
}

func (s *Store) GetRecurringExpense(id string) (RecurringExpense, error) {
	return getByID[RecurringExpense](s, id, identity)
}

func (s *Store) CreateRecurringExpense(item *RecurringExpense) error {
	return s.db.Create(item).Error
}

func (s *Store) UpdateRecurringExpense(item RecurringExpense) error {
	return s.updateByID(TableRecurringExpenses, &RecurringExpense{}, item.ID, item)
}

func (s *Store) DeleteRecurringExpense(id string) error {
	return s.softDelete(&RecurringExpense{}, DeletionEntityRecurringExpense, id)
}

func (s *Store) RestoreRecurringExpense(id string) error {
	return s.restoreEntity(&RecurringExpense{}, DeletionEntityRecurringExpense, id)
}

// MonthlyFixedCostCents sums active recurring expenses normalized to a
// monthly amount (yearly amounts divided by 12).
func (s *Store) MonthlyFixedCostCents() (int64, error) {
	expenses, err := s.ListRecurringExpenses(false)
	if err != nil {
		return 0, err
	}
	var total int64
	for _, e := range expenses {
		if e.Paused {
			continue
		}
		switch e.Interval {
		case ExpenseIntervalYearly:
			total += e.AmountCents / 12
		default:
			total += e.AmountCents
		}
	}
	return total, nil
}
