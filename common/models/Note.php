<?php
namespace common\models;

use yii\db\ActiveRecord;

class Note extends ActiveRecord
{
    public static function tableName() { return 'notes'; }

    public function rules() {
        return [
            [['folder_id'], 'required'],
            [['title', 'content', 'color'], 'safe'],
            [['x', 'y', 'width', 'height', 'folder_id'], 'integer'],
            [['title'], 'string', 'max' => 255],
        ];
    }

    public function getAttachments() {
        return $this -> hasMany(Attachment::class, ['note_id' => 'id']);
    }
    public function extraFields() { return ['attachments']; }
}