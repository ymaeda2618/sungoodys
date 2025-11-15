<?php
declare(strict_types=1);

/**
 * シンプルなお問い合わせ送信エンドポイント。
 *
 * 環境に合わせて宛先メールアドレス（$recipientEmail）や差出人（$fromEmail）を変更してください。
 * フォームからは multipart/form-data (FormData) で送信されることを想定しています。
 */

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'METHOD_NOT_ALLOWED',
    ]);
    exit;
}

mb_language('Japanese');
mb_internal_encoding('UTF-8');
date_default_timezone_set('Asia/Tokyo');

$logDirectory = __DIR__ . '/storage/logs';
$logFilePath = null;
if (is_dir($logDirectory) || mkdir($logDirectory, 0775, true)) {
    $logFilePath = $logDirectory . '/contact.log';
}

$recipientEmail = 'ryota.i.0320@gmail.com'; // 一時的なテスト宛先
$fromEmail = 'no-reply@xs662848.xsrv.jp'; // TODO: 送信ドメインに合わせて設定してください。
$subjectPrefix = '【サングッディーズ】お問い合わせ';

/**
 * @param string $key
 */
function formValue(string $key): string
{
    if (!isset($_POST[$key])) {
        return '';
    }

    $value = $_POST[$key];
    if (is_array($value)) {
        return trim((string)reset($value));
    }

    return trim((string)$value);
}

/**
 * @param string $value
 */
function sanitizeHeader(string $value): string
{
    return preg_replace("/[\r\n]+/", '', $value) ?? '';
}

/**
 * @param string $event
 * @param array<string, mixed> $context
 */
function logContactEvent(string $event, array $context = []): void
{
    global $logFilePath;

    $payload = [
        'timestamp' => date('Y-m-d H:i:s'),
        'event' => $event,
        'context' => $context,
    ];

    $line = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        $line = sprintf('[%s] %s', $payload['timestamp'], $event);
    }

    if ($logFilePath) {
        error_log($line . PHP_EOL, 3, $logFilePath);
    } else {
        error_log($line);
    }
}

$name = formValue('name');
$email = formValue('email');
$phone = formValue('phone');
$message = formValue('message');
$contactMethodSummary = formValue('contact_method_summary') ?: '指定なし';
$agreement = isset($_POST['agreement']) && ($_POST['agreement'] === 'on' || $_POST['agreement'] === '1');

$errors = [];

if ($name === '') {
    $errors['name'] = 'お名前を入力してください。';
}

if ($email === '') {
    $errors['email'] = 'メールアドレスを入力してください。';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = '正しい形式のメールアドレスを入力してください。';
}

if ($phone !== '' && !preg_match('/^[0-9+\-\s()]{10,}$/', $phone)) {
    $errors['phone'] = '電話番号は数字とハイフンで入力してください。';
}

if ($message === '') {
    $errors['message'] = 'お問い合わせ内容を入力してください。';
}

if (!$agreement) {
    $errors['agreement'] = '個人情報取り扱いへの同意が必要です。';
}

logContactEvent('REQUEST_RECEIVED', [
    'name' => $name,
    'email' => $email,
    'phone' => $phone !== '' ? $phone : '未入力',
    'contact_method' => $contactMethodSummary,
    'agreement' => $agreement ? 'accepted' : 'missing',
    'message_preview' => mb_strimwidth($message, 0, 120, '…'),
]);

if (!empty($errors)) {
    logContactEvent('VALIDATION_FAILED', ['errors' => $errors]);
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'VALIDATION_FAILED',
        'errors' => $errors,
    ]);
    exit;
}

$subject = sprintf('%s：%s様より', $subjectPrefix, $name);
$bodyLines = [
    "以下の内容でお問い合わせを受け付けました。",
    '',
    "お名前：{$name}",
    "メールアドレス：{$email}",
    'お電話番号：' . ($phone !== '' ? $phone : '未入力'),
    "ご希望の連絡方法：{$contactMethodSummary}",
    '',
    '--- お問い合わせ内容 ---',
    $message,
    '------------------------',
    '',
    '送信日時：' . date('Y-m-d H:i:s'),
    '送信元IP：' . ($_SERVER['REMOTE_ADDR'] ?? '不明'),
    'ユーザーエージェント：' . ($_SERVER['HTTP_USER_AGENT'] ?? '不明'),
];

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . sanitizeHeader($fromEmail),
    'Reply-To: ' . sanitizeHeader($email),
    'X-Mailer: PHP/' . PHP_VERSION,
];

$success = mb_send_mail(
    $recipientEmail,
    $subject,
    implode("\r\n", $bodyLines),
    implode("\r\n", $headers)
);

if (!$success) {
    logContactEvent('MAIL_SEND_FAILED', [
        'recipient' => $recipientEmail,
        'name' => $name,
        'email' => $email,
        'error' => error_get_last(),
    ]);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'MAIL_SEND_FAILED',
    ]);
    exit;
}

logContactEvent('MAIL_SENT', [
    'recipient' => $recipientEmail,
    'name' => $name,
    'email' => $email,
    'contact_method' => $contactMethodSummary,
]);

echo json_encode([
    'success' => true,
    'message' => 'メールを送信しました。',
]);
