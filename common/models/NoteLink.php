<?php
namespace common\models;

use yii\db\ActiveRecord;

class NoteLink extends ActiveRecord
{
    public static function tableName() { return 'note_links'; }

    public function rules() {
        return [
            [['from_note_id', 'to_note_id'], 'required'],
            [['from_note_id', 'to_note_id'], 'integer'],
        ];
    }
}