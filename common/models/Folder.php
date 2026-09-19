<?php
namespace common\models;

use yii\db\ActiveRecord;

class Folder extends ActiveRecord
{
    public static function tableName() { return 'folders'; }

    public function rules() {
        return [
            [['name'], 'required'],
            [['name'], 'string', 'max' => 255],
            [['parent_id', 'position'], 'integer'],
        ];
    }

    public function getChildren() {
        return $this -> hasMany(Folder::class, ['parent_id' => 'id']);
    }
    public function getNotes() {
        return $this -> hasMany(Note::class, ['folder_id' => 'id']);
    }
    public function fields() {
        return ['id', 'parent_id', 'name', 'position'];
    }
}