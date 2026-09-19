<?php
namespace common\models;

use yii\db\ActiveRecord;

class Attachment extends ActiveRecord
{
    public static function tableName() { return 'attachments'; }

    public function rules() {
        return [
            [['note_id', 'filename'], 'required'],
            [['note_id', 'x', 'y', 'width', 'height'], 'integer'],
            [['filename', 'type'], 'string', 'max' => 255],
        ];
    }

    public function getNote() {
        return $this -> hasOne(Note::class, ['id' => 'note_id']);
    }
}