// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package data

import "gorm.io/gorm"

func (s *Store) ListAssets(includeDeleted bool) ([]Asset, error) {
	return listQuery[Asset](s, includeDeleted, func(db *gorm.DB) *gorm.DB {
		return db.Order(ColName + " asc, " + ColID + " desc")
	})
}

func (s *Store) GetAsset(id string) (Asset, error) {
	return getByID[Asset](s, id, identity)
}

func (s *Store) CreateAsset(item *Asset) error {
	return s.db.Create(item).Error
}

func (s *Store) UpdateAsset(item Asset) error {
	return s.updateByID(TableAssets, &Asset{}, item.ID, item)
}

// DeleteAsset soft-deletes the asset and detaches plan markers pointing at
// it (soft delete is an UPDATE, so the FK's SET NULL never fires).
func (s *Store) DeleteAsset(id string) error {
	return s.Transaction(func(tx *Store) error {
		if err := tx.db.Model(&PlanMarker{}).
			Where(ColAssetID+" = ?", id).
			Update(ColAssetID, nil).Error; err != nil {
			return err
		}
		return tx.softDelete(&Asset{}, DeletionEntityAsset, id)
	})
}

func (s *Store) RestoreAsset(id string) error {
	return s.restoreEntity(&Asset{}, DeletionEntityAsset, id)
}
