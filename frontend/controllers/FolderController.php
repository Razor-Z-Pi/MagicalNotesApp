<?php
namespace frontend\controllers;

use common\models\Folder;
use Yii;
use yii\rest\ActiveController;
use yii\web\Response;

class FolderController extends ActiveController
{
    public $modelClass = 'common\models\Folder';

    public function behaviors() {
        $b = parent::behaviors();
        unset($b['authenticator'], $b['rateLimiter']);
        $b['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $b;
    }

    public function actions() {
        $a = parent::actions();
        unset($a['index']);
        return $a;
    }

    public function actionIndex() {
        Yii::$app -> response -> format = Response::FORMAT_JSON;
        $folders = Folder::find() -> orderBy(['position' => SORT_ASC, 'id' => SORT_ASC]) -> all();
        $out = [];
        foreach ($folders as $f) {
            $out[] = [
                'id'        => (int)$f -> id,
                'parent_id' => $f -> parent_id ? (int)$f -> parent_id : null,
                'name'      => $f -> name,
            ];
        }
        return $out;
    }
}