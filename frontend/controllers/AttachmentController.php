<?php
namespace frontend\controllers;

use common\models\Attachment;
use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\UploadedFile;

class AttachmentController extends Controller
{
    public $enableCsrfValidation = false;

    public function behaviors() {
        $b = parent::behaviors();
        // убираем всё, что требует настройки пользователя/лимитов
        unset($b['authenticator'], $b['rateLimiter']);
        return $b;
    }

    /** POST /api/attachments (multipart: note_id, file) */
    public function actionCreate() {
        Yii::$app -> response -> format = Response::FORMAT_JSON;

        $noteId = (int)Yii::$app -> request -> post('note_id');
        $file   = UploadedFile::getInstanceByName('file');

        if (!$noteId || !$file) {
            Yii::$app -> response -> statusCode = 400;
            return ['error' => 'note_id and file required'];
        }

        $dir = Yii::getAlias('@frontend/web/uploads');
        if (!is_dir($dir)) @mkdir($dir, 0777, true);

        $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->name);
        $name = uniqid('', true) . '_' . $safeName;

        if (!$file -> saveAs($dir . '/' . $name)) {
            Yii::$app -> response -> statusCode = 500;
            return ['error' => 'save failed'];
        }

        $ext  = strtolower($file->extension);
        $type = $ext === 'gif' ? 'gif' : 'image';

        $a = new Attachment();
        $a -> note_id  = $noteId;
        $a -> type     = $type;
        $a -> filename = $name;
        $a -> x = 10; $a->y = 50; $a->width = 200; $a->height = 150;

        if (!$a -> save()) {
            Yii::$app -> response -> statusCode = 422;
            return ['error' => 'db save failed', 'errors' => $a->getErrors()];
        }

        return [
            'id'       => (int)$a -> id,
            'type'     => $a -> type,
            'filename' => $a -> filename,
            'url'      => '/uploads/' . $name,
            'x' => (int)$a -> x, 'y' => (int)$a -> y,
            'width' => (int)$a -> width, 'height' => (int)$a -> height,
        ];
    }

    /** PUT /api/attachments/<id>  (JSON: x,y,width,height) */
    public function actionUpdate($id) {
        Yii::$app -> response -> format = Response::FORMAT_JSON;
        $a = Attachment::findOne($id);
        if (!$a) {
            Yii::$app -> response -> statusCode = 404;
            return ['error' => 'not found'];
        }
        $data = Yii::$app -> request -> getBodyParams();
        if (empty($data)) {
            $data = json_decode(Yii::$app -> request -> getRawBody(), true) ?: [];
        }
        foreach (['x', 'y', 'width', 'height'] as $f) {
            if (isset($data[$f])) $a -> $f = (int)$data[$f];
        }
        $a -> save();
        return ['ok' => true];
    }

    /** DELETE /api/attachments/<id> */
    public function actionDelete($id) {
        Yii::$app -> response -> format = Response::FORMAT_JSON;
        $a = Attachment::findOne($id);
        if ($a) {
            $path = Yii::getAlias('@frontend/web/uploads/' . $a -> filename);
            if (is_file($path)) @unlink($path);
            $a -> delete();
        }
        return ['ok' => true];
    }
}