// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package data

import "gorm.io/gorm"

func (s *Store) ListConsumables(includeDeleted bool) ([]Consumable, error) {
	return listQuery[Consumable](s, includeDeleted, func(db *gorm.DB) *gorm.DB {
		return db.Order(ColName + " asc, " + ColID + " desc")
	})
}

// ListLowStockConsumables returns active consumables at or below their
// minimum quantity.
func (s *Store) ListLowStockConsumables() ([]Consumable, error) {
	var items []Consumable
	err := s.db.
		Where(ColQuantity + " <= " + ColMinQuantity).
		Order(ColName + " asc, " + ColID + " desc").
		Find(&items).Error
	return items, err
}

func (s *Store) GetConsumable(id string) (Consumable, error) {
	return getByID[Consumable](s, id, identity)
}

func (s *Store) CreateConsumable(item *Consumable) error {
	return s.db.Create(item).Error
}

func (s *Store) UpdateConsumable(item Consumable) error {
	return s.updateByID(TableConsumables, &Consumable{}, item.ID, item)
}

func (s *Store) DeleteConsumable(id string) error {
	return s.softDelete(&Consumable{}, DeletionEntityConsumable, id)
}

func (s *Store) RestoreConsumable(id string) error {
	return s.restoreEntity(&Consumable{}, DeletionEntityConsumable, id)
}
