<?php

Class IngotDefaultController {

	public static function someFunc( $data ) {
		$answer = [
			'result' => 'error',
			'message' =>  'Failed to handle this request'
		];
		if ( !$data ) {
			$answer['message'] = 'No data received';
		} else {
			$answer['result'] = 'success';
			$answer['message'] = 'Here you go';
			$answer['dump'] = $data;
		}

		$answer['source'][] = __METHOD__;
		return $answer;
	}

	public static function ajax_handler()
	{
		$answer = [
			'result' => 'error',
			'message' =>  'Failed to handle this request'
		];

		if (!$_POST) {
			$answer['message'] = 'No request received';
		} else {
			if (!$_POST['command']) {
				$answer['message'] = 'No command received';
			} else {
				if (!$_POST['payload']) {
					$answer['message'] = 'No payload received';
				} else {

					if (method_exists(__CLASS__, $_POST['command'])) {
						$command = $_POST['command'];
						$answer = self::$command($_POST['payload']);
					} else {
						$answer['message'] = 'Unknown command ¯\_(ツ)_/¯';
					}

				}
			}
		}
		$answer['source'][] = __METHOD__;
		echo json_encode($answer);
		wp_die();
	}

}

add_action( 'wp_ajax_nopriv_default_controller', [ 'IngotDefaultController', 'ajax_handler' ]);
add_action( 'wp_ajax_default_controller', [ 'IngotDefaultController', 'ajax_handler' ] );