<?php
namespace frontend\controllers;

use common\models\NoteLink;
use Yii;
use yii\rest\ActiveController;
use yii\web\Response;

class LinkController extends ActiveController
{
    public $modelClass = 'common\models\NoteLink';

    public function behaviors() {
        $b = parent::behaviors();
        unset($b['authenticator'], $b['rateLimiter']);
        $b['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $b;
    }
}