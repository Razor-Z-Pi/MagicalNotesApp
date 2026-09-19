<?php
Yii::setAlias('@common', dirname(__DIR__) . '/common');
Yii::setAlias('@frontend', dirname(__DIR__) . '/frontend');

return [
    'id'         => 'notes-app',
    'basePath'   => dirname(__DIR__) . '/frontend',
    'vendorPath' => dirname(__DIR__) . '/vendor',
    'controllerNamespace' => 'frontend\\controllers',
    'components' => [
        'request' => [
            'cookieValidationKey' => 'notes-secret-2024',
            'parsers' => ['application/json' => 'yii\web\JsonParser'],
        ],
        'db' => require __DIR__ . '/db.php',
        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName'  => false,
            'rules' => [
                ''  => 'site/index',

                // REST для папок
                'GET    api/folders'            => 'folder/index',
                'POST   api/folders'            => 'folder/create',
                'GET    api/folders/<id:\d+>'   => 'folder/view',
                'PUT    api/folders/<id:\d+>'   => 'folder/update',
                'DELETE api/folders/<id:\d+>'   => 'folder/delete',

                // REST для заметок
                'GET    api/notes'              => 'note/index',
                'POST   api/notes'              => 'note/create',
                'GET    api/notes/<id:\d+>'     => 'note/view',
                'PUT    api/notes/<id:\d+>'     => 'note/update',
                'DELETE api/notes/<id:\d+>'     => 'note/delete',

                // REST для нитей
                'GET    api/links'              => 'link/index',
                'POST   api/links'              => 'link/create',
                'DELETE api/links/<id:\d+>'     => 'link/delete',

                // Вложения (кастомный контроллер)
                'POST   api/attachments'        => 'attachment/create',
                'PUT    api/attachments/<id:\d+>' => 'attachment/update',
                'DELETE api/attachments/<id:\d+>' => 'attachment/delete',
            ],
        ],
    ],
];