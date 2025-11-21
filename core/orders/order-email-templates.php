<?php
/**
 * Order Email Templates.
 *
 * Responsibilities:
 * - HTML email templates for order notifications.
 * - Sending emails to administrators and customers.
 * - Templates are stored in code (not editable via admin).
 * - Single language support.
 */

namespace Elkaretro\Core\Orders;

use Elkaretro\Core\Email\Email_Service;

defined( 'ABSPATH' ) || exit;

class Order_Email_Templates {

	/**
	 * Send order created email to customer.
	 *
	 * @param int    $order_id Order ID.
	 * @param array  $order_data Order data.
	 * @param string $email Customer email.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function send_order_created_to_customer( $order_id, $order_data, $email ) {
		$subject = sprintf( __( 'Ваш заказ #%s принят', 'elkaretro' ), $order_data['order_number'] );
		$message = $this->get_order_created_template( $order_id, $order_data, true );

		$result = Email_Service::send(
			$email,
			$subject,
			$message,
			array(
				'content_type' => 'html',
				'context'      => array(
					'type'           => 'order_created',
					'order_id'       => $order_id,
					'recipient_type' => 'customer',
				),
			)
		);

		return ! is_wp_error( $result );
	}

	/**
	 * Send order created email to admin.
	 *
	 * @param int    $order_id Order ID.
	 * @param array  $order_data Order data.
	 * @param string $email Admin email.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function send_order_created_to_admin( $order_id, $order_data, $email ) {
		$subject = sprintf( __( 'Новый заказ #%s', 'elkaretro' ), $order_data['order_number'] );
		$message = $this->get_order_created_template( $order_id, $order_data, false );

		$result = Email_Service::send(
			$email,
			$subject,
			$message,
			array(
				'content_type' => 'html',
				'context'      => array(
					'type'           => 'order_created',
					'order_id'       => $order_id,
					'recipient_type' => 'admin',
				),
			)
		);

		return ! is_wp_error( $result );
	}

	/**
	 * Send order closed email to customer (with feedback request).
	 *
	 * @param int    $order_id Order ID.
	 * @param array  $order_data Order data.
	 * @param string $email Customer email.
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function send_order_closed_to_customer( $order_id, $order_data, $email ) {
		$subject = sprintf( __( 'Заказ #%s закрыт', 'elkaretro' ), $order_data['order_number'] );
		$message = $this->get_order_closed_template( $order_id, $order_data );

		$result = Email_Service::send(
			$email,
			$subject,
			$message,
			array(
				'content_type' => 'html',
				'context'      => array(
					'type'           => 'order_closed',
					'order_id'       => $order_id,
					'recipient_type' => 'customer',
				),
			)
		);

		return ! is_wp_error( $result );
	}

	/**
	 * Get order created email template (universal for admin and customer).
	 *
	 * @param int    $order_id Order ID.
	 * @param array  $order_data Order data.
	 * @param bool   $is_customer Is this email for customer.
	 * @return string HTML email content.
	 */
	protected function get_order_created_template( $order_id, $order_data, $is_customer ) {
		$items_html = $this->get_order_items_html( $order_data );

		$greeting = $is_customer
			? __( 'Спасибо за ваш заказ!', 'elkaretro' )
			: __( 'Поступил новый заказ', 'elkaretro' );

		ob_start();
		?>
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title><?php echo esc_html( sprintf( __( 'Заказ #%s', 'elkaretro' ), $order_data['order_number'] ) ); ?></title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
				<h1 style="color: #2c3e50; margin-top: 0;"><?php echo esc_html( $greeting ); ?></h1>
				<p style="font-size: 18px; margin: 0;">
					<?php echo esc_html( sprintf( __( 'Номер заказа: #%s', 'elkaretro' ), $order_data['order_number'] ) ); ?>
				</p>
				<p style="margin: 10px 0 0 0; color: #666;">
					<?php echo esc_html( sprintf( __( 'Дата создания: %s', 'elkaretro' ), date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $order_data['created_at'] ) ) ) ); ?>
				</p>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<h2 style="color: #2c3e50; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
					<?php echo esc_html( __( 'Состав заказа', 'elkaretro' ) ); ?>
				</h2>
				<?php echo $items_html; ?>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<h2 style="color: #2c3e50; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
					<?php echo esc_html( __( 'Адрес доставки', 'elkaretro' ) ); ?>
				</h2>
				<p style="margin: 0;">
					<?php echo esc_html( $order_data['delivery_address'] ?: __( 'Не указан', 'elkaretro' ) ); ?>
				</p>
				<?php if ( ! empty( $order_data['delivery_method'] ) ) : ?>
					<p style="margin: 10px 0 0 0; color: #666;">
						<strong><?php echo esc_html( __( 'Способ доставки:', 'elkaretro' ) ); ?></strong>
						<?php echo esc_html( $order_data['delivery_method'] ); ?>
					</p>
				<?php endif; ?>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<h2 style="color: #2c3e50; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
					<?php echo esc_html( __( 'Итоговая стоимость', 'elkaretro' ) ); ?>
				</h2>
				<table style="width: 100%; border-collapse: collapse;">
					<tr>
						<td style="padding: 8px 0; color: #666;"><?php echo esc_html( __( 'Стоимость товаров:', 'elkaretro' ) ); ?></td>
						<td style="text-align: right; padding: 8px 0; font-weight: bold;">
							<?php echo esc_html( number_format( $order_data['subtotal'], 0, ',', ' ' ) ); ?> ₽
						</td>
					</tr>
					<?php if ( $order_data['discount_amount'] > 0 ) : ?>
						<tr>
							<td style="padding: 8px 0; color: #666;"><?php echo esc_html( __( 'Скидка:', 'elkaretro' ) ); ?></td>
							<td style="text-align: right; padding: 8px 0; color: #27ae60; font-weight: bold;">
								-<?php echo esc_html( number_format( $order_data['discount_amount'], 0, ',', ' ' ) ); ?> ₽
							</td>
						</tr>
					<?php endif; ?>
					<?php if ( $order_data['fee_amount'] > 0 ) : ?>
						<tr>
							<td style="padding: 8px 0; color: #666;"><?php echo esc_html( __( 'Комиссия:', 'elkaretro' ) ); ?></td>
							<td style="text-align: right; padding: 8px 0; font-weight: bold;">
								<?php echo esc_html( number_format( $order_data['fee_amount'], 0, ',', ' ' ) ); ?> ₽
							</td>
						</tr>
					<?php endif; ?>
					<tr style="border-top: 2px solid #3498db;">
						<td style="padding: 12px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">
							<?php echo esc_html( __( 'Итого:', 'elkaretro' ) ); ?>
						</td>
						<td style="text-align: right; padding: 12px 0; font-size: 18px; font-weight: bold; color: #2c3e50;">
							<?php echo esc_html( number_format( $order_data['total_amount'], 0, ',', ' ' ) ); ?> ₽
						</td>
					</tr>
				</table>
			</div>

			<?php if ( $is_customer ) : ?>
				<div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-top: 20px;">
					<p style="margin: 0; color: #2c3e50;">
						<?php echo esc_html( __( 'Мы свяжемся с вами в ближайшее время для подтверждения заказа.', 'elkaretro' ) ); ?>
					</p>
				</div>
			<?php endif; ?>

			<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
				<p style="margin: 0;">
					<?php echo esc_html( sprintf( __( 'Это автоматическое письмо. Пожалуйста, не отвечайте на него.', 'elkaretro' ) ) ); ?>
				</p>
			</div>
		</body>
		</html>
		<?php
		return ob_get_clean();
	}

	/**
	 * Get order closed email template (with feedback request).
	 *
	 * @param int    $order_id Order ID.
	 * @param array  $order_data Order data.
	 * @return string HTML email content.
	 */
	protected function get_order_closed_template( $order_id, $order_data ) {
		ob_start();
		?>
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title><?php echo esc_html( sprintf( __( 'Заказ #%s закрыт', 'elkaretro' ), $order_data['order_number'] ) ); ?></title>
		</head>
		<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
			<div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
				<h1 style="color: #2c3e50; margin-top: 0;"><?php echo esc_html( __( 'Ваш заказ закрыт', 'elkaretro' ) ); ?></h1>
				<p style="font-size: 18px; margin: 0;">
					<?php echo esc_html( sprintf( __( 'Номер заказа: #%s', 'elkaretro' ), $order_data['order_number'] ) ); ?>
				</p>
			</div>

			<div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
				<p style="margin: 0; font-size: 16px;">
					<?php echo esc_html( __( 'Спасибо за ваш заказ! Мы надеемся, что вы остались довольны покупкой.', 'elkaretro' ) ); ?>
				</p>
			</div>

			<div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
				<h2 style="color: #2c3e50; margin-top: 0;">
					<?php echo esc_html( __( 'Помогите нам стать лучше!', 'elkaretro' ) ); ?>
				</h2>
				<p style="margin: 0 0 15px 0;">
					<?php echo esc_html( __( 'Мы будем очень благодарны, если вы оставите отзыв о вашей покупке. Ваше мнение поможет другим покупателям сделать правильный выбор.', 'elkaretro' ) ); ?>
				</p>
				<p style="margin: 0;">
					<a href="<?php echo esc_url( home_url( '/' ) ); ?>" style="display: inline-block; background-color: #2196f3; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
						<?php echo esc_html( __( 'Оставить отзыв', 'elkaretro' ) ); ?>
					</a>
				</p>
			</div>

			<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
				<p style="margin: 0;">
					<?php echo esc_html( sprintf( __( 'Это автоматическое письмо. Пожалуйста, не отвечайте на него.', 'elkaretro' ) ) ); ?>
				</p>
			</div>
		</body>
		</html>
		<?php
		return ob_get_clean();
	}

	/**
	 * Get order items HTML table.
	 *
	 * @param array $order_data Order data.
	 * @return string HTML content.
	 */
	protected function get_order_items_html( $order_data ) {
		$items = $order_data['items'] ?? array();

		if ( empty( $items ) ) {
			return '<p>' . esc_html( __( 'Товары не найдены.', 'elkaretro' ) ) . '</p>';
		}

		ob_start();
		?>
		<table style="width: 100%; border-collapse: collapse;">
			<thead>
				<tr style="background-color: #f5f5f5;">
					<th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; color: #2c3e50;">
						<?php echo esc_html( __( 'Товар', 'elkaretro' ) ); ?>
					</th>
					<th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; color: #2c3e50;">
						<?php echo esc_html( __( 'Цена', 'elkaretro' ) ); ?>
					</th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $items as $item ) : ?>
					<?php
					$item_id   = absint( $item['id'] ?? 0 );
					$item_type = sanitize_text_field( $item['type'] ?? '' );
					$item_post = null;

					if ( $item_type === 'toy_instance' ) {
						$item_post = get_post( $item_id );
					} elseif ( $item_type === 'ny_accessory' ) {
						$item_post = get_post( $item_id );
					}

					$item_title = $item_post ? $item_post->post_title : sprintf( __( 'Товар #%d', 'elkaretro' ), $item_id );
					$item_price = floatval( $item['price'] ?? 0 );
					?>
					<tr style="border-bottom: 1px solid #eee;">
						<td style="padding: 12px;">
							<?php echo esc_html( $item_title ); ?>
						</td>
						<td style="padding: 12px; text-align: right; font-weight: bold;">
							<?php echo esc_html( number_format( $item_price, 0, ',', ' ' ) ); ?> ₽
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<?php
		return ob_get_clean();
	}

}

