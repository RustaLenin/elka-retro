<?php
/**
 * User Email Templates.
 *
 * Responsibilities:
 * - HTML email templates for user-related notifications.
 * - Registration welcome emails.
 * - Single language support.
 */

namespace Elkaretro\Core\UserProfile;

use Elkaretro\Core\Email\Email_Service;

defined( 'ABSPATH' ) || exit;

class User_Email_Templates {

	/**
	 * Send registration welcome email.
	 *
	 * @param int    $user_id User ID.
	 * @param string $username Username.
	 * @param string $email User email.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function send_registration_welcome_email( $user_id, $username, $email ) {
		$subject = __( 'Добро пожаловать на сайт ElkaRetro!', 'elkaretro' );
		$message = $this->get_registration_welcome_template( $user_id, $username );

		$result = Email_Service::send(
			$email,
			$subject,
			$message,
			array(
				'content_type' => 'html',
				'context'      => array(
					'type'           => 'registration_welcome',
					'user_id'        => $user_id,
					'recipient_type' => 'customer',
				),
			)
		);

		return ! is_wp_error( $result );
	}

	/**
	 * Get registration welcome email template.
	 *
	 * @param int    $user_id User ID.
	 * @param string $username Username.
	 * @return string HTML email content.
	 */
	protected function get_registration_welcome_template( $user_id, $username ) {
		$profile_url = get_author_posts_url( $user_id );
		$site_url    = home_url( '/' );

		ob_start();
		?>
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title><?php echo esc_html( __( 'Добро пожаловать на ElkaRetro', 'elkaretro' ) ); ?></title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
				<h1 style="color: #2c3e50; margin-top: 0;"><?php echo esc_html( __( 'Добро пожаловать на ElkaRetro!', 'elkaretro' ) ); ?></h1>
				<p style="font-size: 18px; margin: 0;">
					<?php echo esc_html( __( 'Вы были успешно зарегистрированы на нашем сайте.', 'elkaretro' ) ); ?>
				</p>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<h2 style="color: #2c3e50; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
					<?php echo esc_html( __( 'Данные вашего аккаунта', 'elkaretro' ) ); ?>
				</h2>
				<p style="margin: 10px 0;">
					<strong><?php echo esc_html( __( 'Логин:', 'elkaretro' ) ); ?></strong> 
					<?php echo esc_html( $username ); ?>
				</p>
				<p style="margin: 10px 0; color: #666;">
					<?php echo esc_html( __( 'Пароль был указан вами при регистрации. Если вы забыли пароль, вы можете восстановить его на странице входа.', 'elkaretro' ) ); ?>
				</p>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<h2 style="color: #2c3e50; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
					<?php echo esc_html( __( 'Возможности вашего аккаунта', 'elkaretro' ) ); ?>
				</h2>
				<ul style="margin: 10px 0; padding-left: 20px;">
					<li style="margin: 8px 0;">
						<?php echo esc_html( __( 'Все ваши заказы привязаны к аккаунту и доступны в вашем профиле', 'elkaretro' ) ); ?>
					</li>
					<li style="margin: 8px 0;">
						<?php echo esc_html( __( 'Вы можете редактировать свои персональные данные в любое время', 'elkaretro' ) ); ?>
					</li>
					<li style="margin: 8px 0;">
						<?php echo esc_html( __( 'Только авторизованные пользователи могут участвовать в аукционах (функционал в разработке)', 'elkaretro' ) ); ?>
					</li>
				</ul>
				<p style="margin: 15px 0 0 0;">
					<a href="<?php echo esc_url( $profile_url ); ?>" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
						<?php echo esc_html( __( 'Перейти в профиль', 'elkaretro' ) ); ?>
					</a>
				</p>
			</div>

			<div style="background-color: #fff3cd; padding: 20px; border: 1px solid #ffc107; border-radius: 5px; margin-bottom: 20px;">
				<h2 style="color: #856404; margin-top: 0; border-bottom: 2px solid #ffc107; padding-bottom: 10px;">
					<?php echo esc_html( __( 'Информация о персональных данных (152-ФЗ)', 'elkaretro' ) ); ?>
				</h2>
				<p style="margin: 10px 0; color: #856404;">
					<strong><?php echo esc_html( __( 'Маскировка данных:', 'elkaretro' ) ); ?></strong><br>
					<?php echo esc_html( __( 'Ваши персональные данные будут автоматически замаскированы спустя определенное время после последней авторизации на сайте в соответствии с требованиями 152-ФЗ о персональных данных.', 'elkaretro' ) ); ?>
				</p>
				<p style="margin: 10px 0; color: #856404;">
					<strong><?php echo esc_html( __( 'Удаление аккаунта:', 'elkaretro' ) ); ?></strong><br>
					<?php echo esc_html( __( 'Ваш аккаунт будет автоматически удален через определенное время невзаимодействия с сайтом в соответствии с требованиями 152-ФЗ о персональных данных.', 'elkaretro' ) ); ?>
				</p>
				<p style="margin: 10px 0; color: #856404; font-size: 0.9em;">
					<?php echo esc_html( __( 'Подробную информацию о политике конфиденциальности и обработке персональных данных вы можете найти на нашем сайте.', 'elkaretro' ) ); ?>
				</p>
			</div>

			<div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; text-align: center; color: #666; font-size: 0.9em;">
				<p style="margin: 0;">
					<?php echo esc_html( __( 'Если у вас возникли вопросы, пожалуйста, свяжитесь с нами.', 'elkaretro' ) ); ?>
				</p>
				<p style="margin: 10px 0 0 0;">
					<a href="<?php echo esc_url( $site_url ); ?>" style="color: #3498db; text-decoration: none;">
						<?php echo esc_url( $site_url ); ?>
					</a>
				</p>
			</div>
		</body>
		</html>
		<?php
		return ob_get_clean();
	}

}

