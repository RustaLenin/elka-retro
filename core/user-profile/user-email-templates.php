<?php
/**
 * User Email Templates.
 *
 * Responsibilities:
 * - HTML email templates for user-related notifications.
 * - Registration emails (new code-based auth system).
 * - Code emails for authentication.
 * - Single language support.
 */

namespace Elkaretro\Core\UserProfile;

use Elkaretro\Core\Email\Email_Service;

defined( 'ABSPATH' ) || exit;

class User_Email_Templates {

	/**
	 * Send registration email (new code-based auth system).
	 *
	 * @param string $user_email User email.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function send_registration_email( $user_email ) {
		$subject = __( 'Добро пожаловать на сайт ElkaRetro!', 'elkaretro' );
		$message = $this->get_registration_email_template( $user_email );

		$result = Email_Service::send(
			$user_email,
			$subject,
			$message,
			array(
				'content_type' => 'html',
				'context'      => array(
					'type'           => 'registration',
					'recipient_type' => 'customer',
				),
			)
		);

		return ! is_wp_error( $result );
	}

	/**
	 * Get registration email template (new code-based auth system).
	 *
	 * @param string $user_email User email.
	 * @return string HTML email content.
	 */
	protected function get_registration_email_template( $user_email ) {
		$site_url = home_url( '/' );
		$profile_url = get_permalink( get_page_by_path( 'profile' ) ) ?: $site_url;

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
					<?php echo esc_html( __( 'Как авторизоваться на сайте', 'elkaretro' ) ); ?>
				</h2>
				<p style="margin: 10px 0;">
					<?php echo esc_html( __( 'Для входа на сайт используйте ваш email и код подтверждения, который мы отправили вам в отдельном письме.', 'elkaretro' ) ); ?>
				</p>
				<p style="margin: 10px 0;">
					<?php echo esc_html( __( 'Код действителен в течение 24 часов. Вы можете запросить новый код не ранее чем через 3 минуты после предыдущего запроса.', 'elkaretro' ) ); ?>
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

	/**
	 * Send code email.
	 *
	 * @param string $user_email User email.
	 * @param string $code 6-digit code.
	 * @param int    $generated_at Timestamp when code was generated.
	 * @param string $ip Client IP address.
	 * @param string $user_agent Client user agent.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function send_code_email( $user_email, $code, $generated_at, $ip = '', $user_agent = '' ) {
		$subject = __( 'Код для входа на ElkaRetro', 'elkaretro' );
		$message = $this->get_code_email_template( $code, $generated_at, $ip, $user_agent );

		$result = Email_Service::send(
			$user_email,
			$subject,
			$message,
			array(
				'content_type' => 'html',
				'context'      => array(
					'type'           => 'auth_code',
					'recipient_type' => 'customer',
				),
			)
		);

		return ! is_wp_error( $result );
	}

	/**
	 * Get code email template.
	 *
	 * @param string $code 6-digit code.
	 * @param int    $generated_at Timestamp when code was generated.
	 * @param string $ip Client IP address.
	 * @param string $user_agent Client user agent.
	 * @return string HTML email content.
	 */
	protected function get_code_email_template( $code, $generated_at, $ip = '', $user_agent = '' ) {
		$site_url = home_url( '/' );
		$generated_date = date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $generated_at );

		ob_start();
		?>
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title><?php echo esc_html( __( 'Код для входа', 'elkaretro' ) ); ?></title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center;">
				<h1 style="color: #2c3e50; margin-top: 0;"><?php echo esc_html( __( 'Код для входа', 'elkaretro' ) ); ?></h1>
			</div>

			<div style="background-color: #fff; padding: 30px; border: 2px solid #3498db; border-radius: 5px; margin-bottom: 20px; text-align: center;">
				<div style="font-size: 48px; font-weight: bold; color: #3498db; letter-spacing: 8px; margin: 20px 0;">
					<?php echo esc_html( $code ); ?>
				</div>
				<p style="margin: 10px 0; color: #666; font-size: 14px;">
					<?php echo esc_html( __( 'Код создан:', 'elkaretro' ) ); ?> <?php echo esc_html( $generated_date ); ?>
				</p>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<p style="margin: 10px 0;">
					<?php echo esc_html( __( 'Введите этот код на странице входа для авторизации на сайте.', 'elkaretro' ) ); ?>
				</p>
				<p style="margin: 10px 0; color: #856404;">
					<strong><?php echo esc_html( __( 'Важно:', 'elkaretro' ) ); ?></strong><br>
					<?php echo esc_html( __( 'Код действителен только в течение 24 часов.', 'elkaretro' ) ); ?><br>
					<?php echo esc_html( __( 'Новый код можно запросить не ранее чем через 3 минуты после предыдущего запроса.', 'elkaretro' ) ); ?>
				</p>
			</div>

			<div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; text-align: center; margin-bottom: 20px;">
				<p style="margin: 0;">
					<a href="<?php echo esc_url( $site_url ); ?>" style="display: inline-block; padding: 10px 20px; background-color: #3498db; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">
						<?php echo esc_html( __( 'Перейти на сайт', 'elkaretro' ) ); ?>
					</a>
				</p>
			</div>

			<?php if ( ! empty( $ip ) || ! empty( $user_agent ) ) : ?>
			<div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 11px; color: #999; text-align: center;">
				<p style="margin: 5px 0;">
					<?php if ( ! empty( $ip ) ) : ?>
						<?php echo esc_html( __( 'IP-адрес:', 'elkaretro' ) ); ?> <?php echo esc_html( $ip ); ?><br>
					<?php endif; ?>
					<?php if ( ! empty( $user_agent ) ) : ?>
						<?php echo esc_html( __( 'Устройство:', 'elkaretro' ) ); ?> <?php echo esc_html( $user_agent ); ?>
					<?php endif; ?>
				</p>
			</div>
			<?php endif; ?>
		</body>
		</html>
		<?php
		return ob_get_clean();
	}

}
