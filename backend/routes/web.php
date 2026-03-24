<?php

use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Request;

Route::get('/', function (Request $request) {
    return response()->json([
        'message' => 'Welcome to the Bug Triage System API. Please refer to the documentation for usage details.',
        'documentation_url' => 'https://your-documentation-url.com',
    ]);
});
