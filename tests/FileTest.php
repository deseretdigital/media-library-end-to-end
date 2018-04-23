<?php

namespace Tests;

use GuzzleHttp\Client;
use Orbitale\Component\ImageMagick\Command;
use PHPUnit\Framework\TestCase;
use Tests\Config;

require_once(__DIR__ . '/Config.php');

/**
 * This test requires imagemagick to be installed locally (it checks the path)
 */
class FileTest extends TestCase {
  public function setUp()
  {
    $this->config = (new Config())->config;
  }
  public function testGetFile()
  {
    $idHash = "21ec527041";
    $client = new Client([
      'base_uri' => $this->config->base
    ]);
    $response = $client->get("/file/${idHash}");


    file_put_contents("/tmp/${idHash}", (string) $response->getBody());
    $command = new Command($this->config->imagickpath);
    $imagickResponse = $command->identify("/tmp/${idHash}")->run();
    $this->assertEmpty($imagickResponse->getError());
  }
}
