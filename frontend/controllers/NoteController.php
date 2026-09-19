<?php
namespace frontend\controllers;

use common\models\Note;
use common\models\NoteLink;
use Yii;
use yii\rest\ActiveController;
use yii\web\Response;

class NoteController extends ActiveController
{
    public $modelClass = 'common\models\Note';
    public $enableCsrfValidation = false;

    public function behaviors() {
        $b = parent::behaviors();
        unset($b['authenticator'], $b['rateLimiter']);
        $b['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $b;
    }

    public function actions() {
        $a = parent::actions();
        unset($a['index'], $a['create']);   // свои версии
        return $a;
    }

    /** GET /api/notes?folder_id=X — заметки + связи */
    public function actionIndex($folder_id = null) {
        Yii::$app -> response->format = Response::FORMAT_JSON;

        if ($folder_id === null) {
            $folder_id = (int)Yii::$app -> request -> get('folder_id');
        }

        $query = Note::find();
        if ($folder_id) {
            $query -> andWhere(['folder_id' => (int)$folder_id]);
        }
        $notes = $query -> with('attachments') -> all();

        $ids = array_map(fn($n) => (int)$n -> id, $notes);
        $links = empty($ids) ? [] : NoteLink::find()
            -> where(['from_note_id' => $ids])
            -> andWhere(['to_note_id' => $ids])
            -> all();

        return [
            'notes' => array_map(function ($n) {
                return [
                    'id'        => (int)$n -> id,
                    'folder_id' => (int)$n -> folder_id,
                    'title'     => $n -> title,
                    'content'   => $n -> content,
                    'x'         => (int)$n -> x,
                    'y'         => (int)$n -> y,
                    'width'     => (int)$n -> width,
                    'height'    => (int)$n -> height,
                    'color'     => $n -> color,
                    'attachments' => array_map(fn($a) => [
                        'id'       => (int)$a -> id,
                        'type'     => $a -> type,
                        'filename' => $a -> filename,
                        'url'      => '/uploads/' . $a->filename,
                        'x'        => (int)$a -> x,
                        'y'        => (int)$a -> y,
                        'width'    => (int)$a -> width,
                        'height'   => (int)$a -> height,
                    ], $n -> attachments),
                ];
            }, $notes),
            'links' => array_map(fn($l) => [
                'id'           => (int)$l -> id,
                'from_note_id' => (int)$l -> from_note_id,
                'to_note_id'   => (int)$l -> to_note_id,
            ], $links),
        ];
    }

    /** POST /api/notes — создать заметку (без load(), вручную — надёжнее) */
    public function actionCreate() {
        Yii::$app -> response -> format = Response::FORMAT_JSON;

        $data = Yii::$app -> request -> getBodyParams();
        if (empty($data)) {
            $data = json_decode(Yii::$app -> request -> getRawBody(), true) ?: [];
        }

        $model = new Note();
        $model -> folder_id = (int)($data['folder_id'] ?? 0);
        $model -> title     = (string)($data['title']   ?? '');
        $model -> content   = (string)($data['content'] ?? '');
        $model -> x         = (int)($data['x']      ?? 80);
        $model -> y         = (int)($data['y']      ?? 80);
        $model -> width     = (int)($data['width']  ?? 280);
        $model -> height    = (int)($data['height'] ?? 180);
        $model -> color     = (string)($data['color'] ?? '#e7f1ff');

        if (!$model -> save()) {
            Yii::$app -> response -> statusCode = 422;
            return ['errors' => $model -> getErrors(), 'data' => $data];
        }

        return [
            'id'        => (int)$model -> id,
            'folder_id' => (int)$model -> folder_id,
            'title'     => $model -> title,
            'content'   => $model -> content,
            'x'         => $model -> x,
            'y'         => $model -> y,
            'width'     => $model -> width,
            'height'    => $model -> height,
            'color'     => $model -> color,
            'attachments' => [],
        ];
    }
}